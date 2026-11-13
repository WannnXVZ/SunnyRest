import torch
import torch.nn as nn
from torchvision import models

# Urutan kelas sesuai PRD (orang, bangunan, lanskap) - alfabetis di dataset: bangunan, lanskap, orang
CLASS_NAMES = ["bangunan", "lanskap", "orang"]

def create_model(pretrained=False, num_classes=3):
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT if pretrained else None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_features, num_classes)
    )
    return model
