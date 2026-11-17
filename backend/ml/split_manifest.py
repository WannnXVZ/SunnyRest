import sys
import os
import shutil
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit

SEED = 42

def main(path_in, path_out, sync_classification=True):
    df = pd.read_csv(path_in)
    df["split"] = ""

    # 1) pisahkan test (15%) berdasarkan grup
    gss = GroupShuffleSplit(n_splits=1, test_size=0.15, random_state=SEED)
    rest_idx, test_idx = next(gss.split(df, df["label"], df["group"]))
    df.loc[test_idx, "split"] = "test"

    # 2) dari sisanya, pisahkan val (~15% dari total) berdasarkan grup
    rest = df.iloc[rest_idx]
    gss2 = GroupShuffleSplit(n_splits=1, test_size=0.1765, random_state=SEED)
    tr_idx, va_idx = next(gss2.split(rest, rest["label"], rest["group"]))
    df.loc[rest.index[tr_idx], "split"] = "train"
    df.loc[rest.index[va_idx], "split"] = "val"

    df.to_csv(path_out, index=False)

    print("=== Distribusi Split per Kelas ===")
    print(df.groupby(["split", "label"]).size().unstack(fill_value=0))

    # periksa: tidak ada grup yang muncul di lebih dari satu split
    bocor = df.groupby("group")["split"].nunique()
    assert (bocor == 1).all(), "ada grup di lebih dari satu split"
    print("\n[OK] Tidak ada kebocoran grup antar split.")

    t = df[df["split"] == "test"]["label"].value_counts()
    print("test per kelas:", t.to_dict(), "(target: >=10 per kelas, total >=30)")
    assert len(df[df["split"] == "test"]) >= 30, f"Test count {len(df[df['split'] == 'test'])} < 30"
    for cls in ["bangunan", "lanskap", "orang"]:
        cnt = t.get(cls, 0)
        assert cnt >= 10, f"Test class {cls} count {cnt} < 10"
    print("[OK] Syarat test terpenuhi (test >= 30, tiap kelas >= 10).\n")

    if sync_classification:
        data_dir = os.path.dirname(os.path.abspath(path_out))
        print("Menyinkronkan foto ke folder classification/...")
        for _, row in df.iterrows():
            src_file = os.path.join(data_dir, row["path"])
            dest_dir = os.path.join(data_dir, "classification", row["split"], row["label"])
            os.makedirs(dest_dir, exist_ok=True)
            fname = os.path.basename(row["path"])
            dest_file = os.path.join(dest_dir, fname)
            if not os.path.exists(dest_file):
                shutil.copy2(src_file, dest_file)
        print("[OK] Folder classification/{train,val,test} berhasil disinkronkan.")

if __name__ == "__main__":
    p_in = sys.argv[1] if len(sys.argv) > 1 else "backend/ml/data/manifest.csv"
    p_out = sys.argv[2] if len(sys.argv) > 2 else p_in
    main(p_in, p_out)
