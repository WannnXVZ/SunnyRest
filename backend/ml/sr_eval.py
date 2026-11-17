import os
import time
import math
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F

# ==============================================================================
# 1. Arsitektur Pure PyTorch RRDBNet (Real-ESRGAN x4)
# ==============================================================================
class ResidualDenseBlock_5C(nn.Module):
    def __init__(self, nf=64, gc=32, bias=True):
        super().__init__()
        self.conv1 = nn.Conv2d(nf, gc, 3, 1, 1, bias=bias)
        self.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1, bias=bias)
        self.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1, bias=bias)
        self.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1, bias=bias)
        self.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1, bias=bias)
        self.lrelu = nn.LeakyReLU(negative_slope=0.2, inplace=True)

    def forward(self, x):
        x1 = self.lrelu(self.conv1(x))
        x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1)))
        x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
        return x5 * 0.2 + x


class RRDB(nn.Module):
    def __init__(self, nf=64, gc=32):
        super().__init__()
        self.rdb1 = ResidualDenseBlock_5C(nf, gc)
        self.rdb2 = ResidualDenseBlock_5C(nf, gc)
        self.rdb3 = ResidualDenseBlock_5C(nf, gc)

    def forward(self, x):
        out = self.rdb1(x)
        out = self.rdb2(out)
        out = self.rdb3(out)
        return out * 0.2 + x


class RRDBNet(nn.Module):
    def __init__(self, num_in_ch=3, num_out_ch=3, scale=4, num_feat=64, num_block=23, num_grow_ch=32):
        super().__init__()
        self.scale = scale
        self.conv_first = nn.Conv2d(num_in_ch, num_feat, 3, 1, 1)
        self.body = nn.Sequential(*[RRDB(num_feat, num_grow_ch) for _ in range(num_block)])
        self.conv_body = nn.Conv2d(num_feat, num_feat, 3, 1, 1)
        self.conv_up1 = nn.Conv2d(num_feat, num_feat, 3, 1, 1)
        self.conv_up2 = nn.Conv2d(num_feat, num_feat, 3, 1, 1)
        self.conv_hr = nn.Conv2d(num_feat, num_feat, 3, 1, 1)
        self.conv_last = nn.Conv2d(num_feat, num_out_ch, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(negative_slope=0.2, inplace=True)

    def forward(self, x):
        feat = self.conv_first(x)
        body_feat = self.conv_body(self.body(feat))
        feat = feat + body_feat
        feat = self.lrelu(self.conv_up1(F.interpolate(feat, scale_factor=2, mode="nearest")))
        feat = self.lrelu(self.conv_up2(F.interpolate(feat, scale_factor=2, mode="nearest")))
        out = self.conv_last(self.lrelu(self.conv_hr(feat)))
        return out

class RealESRGANEnhancer:
    def __init__(self, model_path="models/RealESRGAN_x4plus.pth", device=None):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = RRDBNet(num_in_ch=3, num_out_ch=3, scale=4, num_feat=64, num_block=23, num_grow_ch=32)
        if os.path.exists(model_path):
            ckpt = torch.load(model_path, map_location=self.device, weights_only=False)
            state = ckpt.get("params_ema", ckpt.get("params", ckpt))
            self.model.load_state_dict(state)
        self.model.to(self.device).eval()

    @torch.no_grad()
    def enhance(self, pil_img):
        img = np.array(pil_img.convert("RGB")).astype(np.float32) / 255.0
        img_t = torch.from_numpy(img).permute(2, 0, 1).unsqueeze(0).to(self.device)
        out_t = self.model(img_t)
        out = out_t.squeeze(0).permute(1, 2, 0).clamp(0, 1).cpu().numpy()
        out = (out * 255.0).round().astype(np.uint8)
        return Image.fromarray(out)


# ==============================================================================
# 3. Metrik Evaluasi: PSNR & SSIM
# ==============================================================================
def calculate_psnr(img1, img2):
    mse = np.mean((img1.astype(np.float64) - img2.astype(np.float64)) ** 2)
    if mse == 0:
        return float("inf")
    return 20 * np.log10(255.0 / np.sqrt(mse))


def calculate_ssim(img1, img2):
    if img1.ndim == 3:
        gray1 = 0.299 * img1[:, :, 0] + 0.587 * img1[:, :, 1] + 0.114 * img1[:, :, 2]
        gray2 = 0.299 * img2[:, :, 0] + 0.587 * img2[:, :, 1] + 0.114 * img2[:, :, 2]
    else:
        gray1, gray2 = img1, img2

    C1 = (0.01 * 255) ** 2
    C2 = (0.03 * 255) ** 2
    mu1 = gray1.mean()
    mu2 = gray2.mean()
    sigma1_sq = ((gray1 - mu1) ** 2).mean()
    sigma2_sq = ((gray2 - mu2) ** 2).mean()
    sigma12 = ((gray1 - mu1) * (gray2 - mu2)).mean()

    num = (2 * mu1 * mu2 + C1) * (2 * sigma12 + C2)
    den = (mu1 ** 2 + mu2 ** 2 + C1) * (sigma1_sq + sigma2_sq + C2)
    return float(num / den)


def run_benchmark(sample_limit=10):
    base_dir = os.path.join(os.path.dirname(__file__), "data", "restorasi")
    hr_dir = os.path.join(base_dir, "hr")
    lr_dir = os.path.join(base_dir, "lr")
    out_dir = os.path.join(base_dir, "output_sr")
    os.makedirs(out_dir, exist_ok=True)

    files = [f for f in os.listdir(hr_dir) if f.lower().endswith((".png", ".jpg", ".jpeg"))]
    files = files[:sample_limit]

    print("=" * 65)
    print("Benchmark Restorasi: Real-ESRGAN x4 vs Bicubic Baseline")
    print(f"Jumlah sampel diuji: {len(files)}")
    print("=" * 65)

    enhancer = RealESRGANEnhancer()

    for idx, fname in enumerate(files):
        hr_path = os.path.join(hr_dir, fname)
        lr_path = os.path.join(lr_dir, fname)

        img_hr = Image.open(hr_path).convert("RGB")
        img_lr = Image.open(lr_path).convert("RGB")
        arr_hr = np.array(img_hr)

        # Baseline Bicubic Upscale 4x
        t_bic_0 = time.time()
        img_bicubic = img_lr.resize(img_hr.size, resample=Image.Resampling.BICUBIC)
        t_bic = time.time() - t_bic_0
        arr_bic = np.array(img_bicubic)
        psnr_bic = calculate_psnr(arr_hr, arr_bic)
        ssim_bic = calculate_ssim(arr_hr, arr_bic)

        # Real-ESRGAN Upscale 4x
        t_sr_0 = time.time()
        img_sr = enhancer.enhance(img_lr)
        t_sr = time.time() - t_sr_0
        arr_sr = np.array(img_sr)
        
        # Samakan dimensi jika ada perbedaan 1-2px karena padding
        if arr_sr.shape != arr_hr.shape:
            img_sr = img_sr.resize(img_hr.size, resample=Image.Resampling.LANCZOS)
            arr_sr = np.array(img_sr)

        psnr_sr = calculate_psnr(arr_hr, arr_sr)
        ssim_sr = calculate_ssim(arr_hr, arr_sr)

        # Simpan output hasil AI
        sr_save_path = os.path.join(out_dir, f"sr_{fname}")
        img_sr.save(sr_save_path)

        print(f"Foto: {fname} (HR: {img_hr.size[0]}x{img_hr.size[1]} | LR: {img_lr.size[0]}x{img_lr.size[1]})")
        print(f"  [Bicubic]     PSNR: {psnr_bic:.2f} dB | SSIM: {ssim_bic:.4f} | Waktu: {t_bic*1000:.1f}ms")
        print(f"  [Real-ESRGAN] PSNR: {psnr_sr:.2f} dB | SSIM: {ssim_sr:.4f} | Waktu: {t_sr:.2f}s -> Saved {sr_save_path}")
        print("-" * 65)


if __name__ == "__main__":
    run_benchmark(sample_limit=10)
