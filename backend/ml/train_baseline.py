# Train Baseline: KNN & SVM pada fitur histogram + GLCM
import os
import time
import json
import numpy as np
import pandas as pd
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    confusion_matrix, classification_report
)
from ml.features import extract_dataset

FEATURES_CSV = os.path.join(os.path.dirname(__file__), "features.csv")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "classification")
LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "experiments")
os.makedirs(LOG_DIR, exist_ok=True)

LABEL_MAP = {"bangunan": 0, "lanskap": 1, "orang": 2}
LABELS = ["bangunan", "lanskap", "orang"]

def load_features():
    if not os.path.exists(FEATURES_CSV):
        print("Extracting features...")
        extract_dataset(DATA_DIR, FEATURES_CSV)
    
    df = pd.read_csv(FEATURES_CSV)
    feat_cols = [c for c in df.columns if c.startswith("hist_") or c.startswith("glcm_")]
    
    train_df = df[df["split"] == "train"]
    val_df = df[df["split"] == "val"]
    test_df = df[df["split"] == "test"]
    
    X_train = train_df[feat_cols].values
    y_train = train_df["label"].map(LABEL_MAP).values
    X_val = val_df[feat_cols].values
    y_val = val_df["label"].map(LABEL_MAP).values
    X_test = test_df[feat_cols].values
    y_test = test_df["label"].map(LABEL_MAP).values
    
    return X_train, y_train, X_val, y_val, X_test, y_test

def evaluate_model(name, clf, X_train, y_train, X_test, y_test):
    t0 = time.time()
    clf.fit(X_train, y_train)
    train_time = time.time() - t0
    
    t1 = time.time()
    y_pred = clf.predict(X_test)
    infer_time = time.time() - t1
    
    acc = accuracy_score(y_test, y_pred)
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='macro')
    cm = confusion_matrix(y_test, y_pred).tolist()
    
    report = classification_report(y_test, y_pred, target_names=LABELS)
    print(f"\n{'='*50}")
    print(f"Model: {name}")
    print(f"{'='*50}")
    print(report)
    print(f"Confusion Matrix:\n{confusion_matrix(y_test, y_pred)}")
    print(f"Macro-F1: {f1:.4f}")
    print(f"Train time: {train_time:.3f}s, Inference time: {infer_time:.4f}s")
    
    return {
        "model": name,
        "accuracy": round(acc, 4),
        "macro_precision": round(prec, 4),
        "macro_recall": round(rec, 4),
        "macro_f1": round(f1, 4),
        "confusion_matrix": cm,
        "train_time_s": round(train_time, 3),
        "inference_time_s": round(infer_time, 4),
    }

if __name__ == "__main__":
    X_train, y_train, X_val, y_val, X_test, y_test = load_features()
    print(f"Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")
    
    results = []
    
    # KNN
    knn = KNeighborsClassifier(n_neighbors=5)
    results.append(evaluate_model("KNN (k=5)", knn, X_train, y_train, X_test, y_test))
    
    # SVM
    svm = SVC(kernel='rbf', C=10, gamma='scale')
    results.append(evaluate_model("SVM (RBF, C=10)", svm, X_train, y_train, X_test, y_test))
    
    # Save
    log_path = os.path.join(LOG_DIR, "baseline_results.json")
    with open(log_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {log_path}")
