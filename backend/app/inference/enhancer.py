import os
import torch
import numpy as np
from PIL import Image
import sys

# Import arsitektur dari ml/sr_eval.py
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml"))
from sr_eval import RRDBNet

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
