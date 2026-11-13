# Evaluasi model: metrik lengkap pada test set + contoh gagal
import os
import json
import torch
import torch.nn.functional as F
from torchvision.datasets import ImageFolder
from torch.utils.data import DataLoader
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    confusion_matrix, classification_report
)
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from ml.preprocess import get_transform
from backend.app.inference.classifier import create_model, CLASS_NAMES

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "classification")
CHECKPOINT_DIR = os.path.join(os.path.dirname(__file__), "checkpoints")
LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "experiments")
os.makedirs(LOG_DIR, exist_ok=True)

def evaluate(checkpoint_name="best_finetuned.pth"):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    ckpt_path = os.path.join(CHECKPOINT_DIR, checkpoint_name)
    
    # Fallback ke models/ jika checkpoint belum ada di ml/checkpoints/
    if not os.path.exists(ckpt_path):
        alt = os.path.join(os.path.dirname(__file__), "..", "models", "finetuned_model_3class.pth")
        if os.path.exists(alt):
            ckpt_path = alt
        else:
            alt2 = os.path.join(os.path.dirname(__file__), "..", "models", "best_model_3class.pth")
            ckpt_path = alt2
    
    model = create_model(pretrained=False).to(device)
    ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()
    
    test_ds = ImageFolder(os.path.join(DATA_DIR, "test"), transform=get_transform("test"))
    test_loader = DataLoader(test_ds, batch_size=32, shuffle=False, num_workers=0)
    
    all_preds, all_labels, all_probs = [], [], []
    failed_examples = []
    
    with torch.no_grad():
        for imgs, labels in test_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            outputs = model(imgs)
            probs = F.softmax(outputs, dim=1)
            preds = outputs.argmax(1)
            
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            all_probs.extend(probs.cpu().numpy())
    
    import numpy as np
    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    
    # Contoh gagal
    wrong_mask = all_preds != all_labels
    for i in np.where(wrong_mask)[0]:
        path, _ = test_ds.samples[i]
        failed_examples.append({
            "file": os.path.basename(path),
            "true": CLASS_NAMES[all_labels[i]],
            "predicted": CLASS_NAMES[all_preds[i]],
            "confidence": float(all_probs[i][all_preds[i]]),
        })
    
    acc = accuracy_score(all_labels, all_preds)
    prec, rec, f1, _ = precision_recall_fscore_support(all_labels, all_preds, average=None)
    macro_f1 = precision_recall_fscore_support(all_labels, all_preds, average='macro')[2]
    cm = confusion_matrix(all_labels, all_preds)
    
    report = classification_report(all_labels, all_preds, target_names=CLASS_NAMES)
    print(f"Checkpoint: {ckpt_path}")
    print(report)
    print(f"Confusion Matrix:\n{cm}")
    print(f"\nContoh gagal ({len(failed_examples)}):")
    for ex in failed_examples[:10]:
        print(f"  {ex['file']}: true={ex['true']}, pred={ex['predicted']} ({ex['confidence']:.2%})")
    
    # Jumlah per kelas di test
    class_counts = {CLASS_NAMES[i]: int((all_labels == i).sum()) for i in range(len(CLASS_NAMES))}
    
    result = {
        "checkpoint": os.path.basename(ckpt_path),
        "test_samples": len(all_labels),
        "class_counts": class_counts,
        "accuracy": round(acc, 4),
        "per_class": {
            CLASS_NAMES[i]: {
                "precision": round(float(prec[i]), 4),
                "recall": round(float(rec[i]), 4),
                "f1": round(float(f1[i]), 4),
            } for i in range(len(CLASS_NAMES))
        },
        "macro_f1": round(float(macro_f1), 4),
        "confusion_matrix": cm.tolist(),
        "failed_examples": failed_examples,
    }
    
    log_path = os.path.join(LOG_DIR, "cnn_eval_results.json")
    with open(log_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nSaved to {log_path}")
    return result

if __name__ == "__main__":
    evaluate()
