# Train CNN (EfficientNet-B0 Transfer Learning) - 3 kelas: bangunan, lanskap, orang
import os
import json
import time
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision.datasets import ImageFolder

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from ml.preprocess import get_transform
from backend.app.inference.classifier import create_model, CLASS_NAMES

SEED = 42
torch.manual_seed(SEED)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "classification")
CHECKPOINT_DIR = os.path.join(os.path.dirname(__file__), "checkpoints")
LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "experiments")
os.makedirs(CHECKPOINT_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

def train(epochs=15, lr=1e-3, batch_size=32, freeze=True, experiment_name="frozen"):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}, Experiment: {experiment_name}")

    train_ds = ImageFolder(os.path.join(DATA_DIR, "train"), transform=get_transform("train"))
    val_ds = ImageFolder(os.path.join(DATA_DIR, "val"), transform=get_transform("val"))
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    model = create_model(pretrained=True).to(device)
    if freeze:
        for param in model.features.parameters():
            param.requires_grad = False

    optimizer = torch.optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=lr)
    criterion = nn.CrossEntropyLoss()
    
    best_val_acc = 0.0
    log = []

    for epoch in range(epochs):
        t0 = time.time()
        model.train()
        train_loss, train_correct, train_total = 0, 0, 0
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * imgs.size(0)
            train_correct += (outputs.argmax(1) == labels).sum().item()
            train_total += imgs.size(0)

        # Validation
        model.eval()
        val_loss, val_correct, val_total = 0, 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * imgs.size(0)
                val_correct += (outputs.argmax(1) == labels).sum().item()
                val_total += imgs.size(0)

        train_acc = train_correct / train_total
        val_acc = val_correct / val_total
        elapsed = time.time() - t0

        entry = {
            "epoch": epoch + 1,
            "train_loss": train_loss / train_total,
            "train_acc": train_acc,
            "val_loss": val_loss / val_total,
            "val_acc": val_acc,
            "time_s": round(elapsed, 2),
        }
        log.append(entry)
        print(f"Epoch {epoch+1}/{epochs}: train_acc={train_acc:.4f} val_acc={val_acc:.4f} ({elapsed:.1f}s)")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            ckpt_path = os.path.join(CHECKPOINT_DIR, f"best_{experiment_name}.pth")
            torch.save({
                "model_state_dict": model.state_dict(),
                "epoch": epoch + 1,
                "val_acc": val_acc,
                "class_names": CLASS_NAMES,
            }, ckpt_path)
            print(f"  -> Saved best checkpoint: val_acc={val_acc:.4f}")

    # Save log
    log_path = os.path.join(LOG_DIR, f"train_log_{experiment_name}.json")
    with open(log_path, "w") as f:
        json.dump(log, f, indent=2)
    print(f"\nBest val_acc: {best_val_acc:.4f}")
    return best_val_acc

if __name__ == "__main__":
    # Eksperimen terkontrol PRD: frozen vs fine-tuned
    print("=" * 60)
    print("EKSPERIMEN 1: Frozen backbone")
    print("=" * 60)
    acc_frozen = train(epochs=15, freeze=True, experiment_name="frozen")
    
    print("\n" + "=" * 60)
    print("EKSPERIMEN 2: Fine-tuned (unfrozen) backbone")
    print("=" * 60)
    acc_finetuned = train(epochs=15, lr=1e-4, freeze=False, experiment_name="finetuned")
    
    print("\n" + "=" * 60)
    print("KESIMPULAN EKSPERIMEN TERKONTROL")
    print("=" * 60)
    print(f"Frozen backbone   : {acc_frozen:.4f}")
    print(f"Fine-tuned backbone: {acc_finetuned:.4f}")
    if acc_finetuned > acc_frozen:
        print("-> Fine-tuning memberikan akurasi lebih baik.")
    else:
        print("-> Frozen backbone sudah cukup baik / lebih baik.")
