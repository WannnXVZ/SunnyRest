import math
import os
import sys
import torch
import numpy as np
from PIL import Image

# Import arsitektur dari ml/sr_eval.py
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "ml"))
from sr_eval import RRDBNet


class RealESRGANEnhancer:
    def __init__(self, model_path="models/RealESRGAN_x4plus.pth", device=None, tile_size=512, tile_pad=16):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Checkpoint Real-ESRGAN tidak ditemukan di: {model_path}")

        self.model_path = model_path
        self.scale = 4
        self.tile_size = tile_size
        self.tile_pad = tile_pad
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = RRDBNet(num_in_ch=3, num_out_ch=3, scale=self.scale, num_feat=64, num_block=23, num_grow_ch=32)

        ckpt = torch.load(model_path, map_location=self.device, weights_only=True)
        state = ckpt.get("params_ema", ckpt.get("params", ckpt))
        self.model.load_state_dict(state)
        self.model.to(self.device).eval()

    @torch.no_grad()
    def enhance(self, pil_img: Image.Image) -> Image.Image:
        img = np.array(pil_img.convert("RGB")).astype(np.float32) / 255.0
        img_t = torch.from_numpy(img).permute(2, 0, 1).unsqueeze(0).to(self.device)

        _, _, h, w = img_t.shape
        if h <= self.tile_size and w <= self.tile_size:
            out_t = self.model(img_t)
        else:
            out_t = self._tile_process(img_t)

        out = out_t.squeeze(0).permute(1, 2, 0).clamp(0, 1).cpu().numpy()
        out = (out * 255.0).round().astype(np.uint8)
        return Image.fromarray(out)

    def _tile_process(self, img_t: torch.Tensor) -> torch.Tensor:
        """Memproses gambar besar secara bertahap (tile 512x512) untuk mencegah OOM."""
        batch, channel, height, width = img_t.shape
        output_shape = (batch, channel, height * self.scale, width * self.scale)
        output = img_t.new_zeros(output_shape)

        tiles_x = math.ceil(width / self.tile_size)
        tiles_y = math.ceil(height / self.tile_size)

        for y in range(tiles_y):
            for x in range(tiles_x):
                ofs_x = x * self.tile_size
                ofs_y = y * self.tile_size

                input_start_x = max(ofs_x - self.tile_pad, 0)
                input_end_x = min(ofs_x + self.tile_size + self.tile_pad, width)
                input_start_y = max(ofs_y - self.tile_pad, 0)
                input_end_y = min(ofs_y + self.tile_size + self.tile_pad, height)

                input_tile = img_t[:, :, input_start_y:input_end_y, input_start_x:input_end_x]
                output_tile = self.model(input_tile)

                output_start_x = ofs_x * self.scale
                output_end_x = min(ofs_x + self.tile_size, width) * self.scale
                output_start_y = ofs_y * self.scale
                output_end_y = min(ofs_y + self.tile_size, height) * self.scale

                tile_start_x = (ofs_x - input_start_x) * self.scale
                tile_end_x = tile_start_x + (output_end_x - output_start_x)
                tile_start_y = (ofs_y - input_start_y) * self.scale
                tile_end_y = tile_start_y + (output_end_y - output_start_y)

                output[:, :, output_start_y:output_end_y, output_start_x:output_end_x] = output_tile[
                    :, :, tile_start_y:tile_end_y, tile_start_x:tile_end_x
                ]

        return output
