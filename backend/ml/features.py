# Ekstraksi fitur histogram warna + GLCM untuk baseline KNN/SVM
import os
import numpy as np
from PIL import Image
from skimage.feature import graycomatrix, graycoprops
import csv

def extract_color_histogram(img_array, bins=32):
    """Histogram warna RGB, dinormalisasi."""
    features = []
    for c in range(3):
        hist, _ = np.histogram(img_array[:, :, c], bins=bins, range=(0, 256))
        hist = hist.astype(np.float64) / (hist.sum() + 1e-7)
        features.extend(hist)
    return features

def extract_glcm(img_array, distances=[1], angles=[0, np.pi/4, np.pi/2]):
    """GLCM texture features: contrast, dissimilarity, homogeneity, energy, correlation."""
    gray = np.mean(img_array, axis=2).astype(np.uint8)
    glcm = graycomatrix(gray, distances=distances, angles=angles, levels=256, symmetric=True, normed=True)
    props = []
    for prop in ['contrast', 'dissimilarity', 'homogeneity', 'energy', 'correlation']:
        val = graycoprops(glcm, prop).flatten()
        props.extend(val.tolist())
    return props

def extract_features(image_path, resize=(128, 128)):
    """Extract gabungan histogram + GLCM."""
    img = Image.open(image_path).convert("RGB").resize(resize)
    arr = np.array(img)
    hist = extract_color_histogram(arr)
    glcm = extract_glcm(arr)
    return hist + glcm

def extract_dataset(data_dir, output_csv):
    """Extract features dari dataset classification/ dan simpan CSV."""
    label_map = {"bangunan": 0, "lanskap": 1, "orang": 2}
    rows = []
    
    for split in ["train", "val", "test"]:
        split_dir = os.path.join(data_dir, split)
        for label_name in sorted(os.listdir(split_dir)):
            label_dir = os.path.join(split_dir, label_name)
            if not os.path.isdir(label_dir):
                continue
            for fname in sorted(os.listdir(label_dir)):
                fpath = os.path.join(label_dir, fname)
                try:
                    feats = extract_features(fpath)
                    rows.append([split, label_name, fname] + feats)
                except Exception as e:
                    print(f"Skip {fpath}: {e}")
    
    # Header
    n_hist = 32 * 3
    n_glcm = 5 * 3  # 5 props x 3 angles
    headers = ["split", "label", "filename"]
    headers += [f"hist_{i}" for i in range(n_hist)]
    headers += [f"glcm_{i}" for i in range(n_glcm)]
    
    with open(output_csv, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(headers)
        w.writerows(rows)
    
    print(f"Extracted {len(rows)} samples -> {output_csv}")
    return rows

if __name__ == "__main__":
    base = os.path.join(os.path.dirname(__file__), "data", "classification")
    extract_dataset(base, os.path.join(os.path.dirname(__file__), "features.csv"))
