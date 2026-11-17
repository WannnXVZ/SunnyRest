# Preprocess: Resize, normalisasi, augmentasi konsisten
import os
from torchvision import transforms
from torchvision.datasets import ImageFolder

TRAIN_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

VAL_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def get_transform(split):
    """Augmentasi HANYA pada train."""
    return TRAIN_TRANSFORM if split == "train" else VAL_TRANSFORM

if __name__ == "__main__":
    import torch
    data_dir = os.path.join(os.path.dirname(__file__), "data", "classification")
    for split in ["train", "val", "test"]:
        ds = ImageFolder(os.path.join(data_dir, split), transform=get_transform(split))
        sample, label = ds[0]
        print(f"{split}: {len(ds)} imgs, shape={sample.shape}, range=[{sample.min():.2f}, {sample.max():.2f}]")
