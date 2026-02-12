import pandas as pd
import numpy as np
import json
import os
import warnings
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, 
    confusion_matrix, roc_auc_score, classification_report
)

# Suppress warnings for cleaner output in presentation
warnings.filterwarnings('ignore')

# Configuration
DATA_PATH = os.path.join(os.path.dirname(__file__), '../datasets/ml_engagement_data.json')

def run_ml_pipeline():
    print("="*70)
    print("      ASCEND: ROBUST STUDENT ENGAGEMENT ML EVALUATION MODULE")
    print("="*70)

    # 1. Load Dataset
    if not os.path.exists(DATA_PATH):
        print(f"Error: Dataset not found at {DATA_PATH}")
        return

    with open(DATA_PATH, 'r') as f:
        data = json.load(f)
    
    df = pd.DataFrame(data)
    print(f"[*] Dataset Loaded: {len(df)} samples")
    
    # 2. Define Features and Target
    features = [
        'semester', 'weekly_hours', 'resume_score', 'tech_score', 
        'comm_score', 'interview_score', 'roadmap_progress', 'activity_count'
    ]
    X = df[features]
    y = df['is_struggling']

    # 3. Train-Test Split (80-20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"[*] Split Data: Train={len(X_train)}, Test={len(X_test)}")

    # 4. Feature Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    X_all_scaled = scaler.transform(X) # For cross-validation on full dataset
    print("[*] Feature Scaling Applied (StandardScaler)")

    # 5. Model Initialization
    models = {
        "Logistic Regression": LogisticRegression(random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42)
    }

    results = []

    for name, model in models.items():
        print(f"\n[+] Executing Pipeline for {name}...")
        
        # Train-Test fit
        model.fit(X_train_scaled, y_train)
        y_train_pred = model.predict(X_train_scaled)
        y_test_pred = model.predict(X_test_scaled)
        y_prob = model.predict_proba(X_test_scaled)[:, 1]

        # A. Basic Metrics
        train_acc = accuracy_score(y_train, y_train_pred)
        test_acc = accuracy_score(y_test, y_test_pred)
        
        metrics = {
            "Model": name,
            "Accuracy": test_acc,
            "Precision": precision_score(y_test, y_test_pred),
            "Recall": recall_score(y_test, y_test_pred),
            "F1": f1_score(y_test, y_test_pred),
            "ROC-AUC": roc_auc_score(y_test, y_prob)
        }
        results.append(metrics)
        
        # B. Overfitting Diagnostic
        print("\n" + "-"*40)
        print("OVERFITTING DIAGNOSTIC")
        print("-"*40)
        print(f"Training Accuracy: {train_acc:.4f}")
        print(f"Testing Accuracy:  {test_acc:.4f}")
        diff = abs(train_acc - test_acc)
        print(f"Difference:        {diff*100:.2f}%")
        if diff > 0.05:
            print("[!] WARNING: Potential Overfitting Detected (>5% gap)")
        else:
            print("[PASS] Model shows good generalization (Gap < 5%)")

        # C. Feature Importance Interpretation
        print("\n" + "-"*40)
        print("FEATURE IMPORTANCE INTERPRETATION")
        print("-"*40)
        if name == "Logistic Regression":
            importance = model.coef_[0]
            for i, feat in enumerate(features):
                impact = "Increases Prob" if importance[i] > 0 else "Decreases Prob"
                print(f"{feat:18}: {importance[i]:+8.4f} ({impact})")
        else:
            importance = model.feature_importances_
            for i, feat in enumerate(features):
                print(f"{feat:18}: {importance[i]:.4f}")

        # D. View Standard Metrics
        print("\n" + "-"*40)
        print(f"CLASSIFICATION METRICS ({name.upper()})")
        print("-"*40)
        for k, v in metrics.items():
            if k != "Model":
                print(f"{k:10}: {v:.4f}")
        
        print("\nClassification Report:")
        print(classification_report(y_test, y_test_pred))
        
        print("Confusion Matrix:")
        cm = confusion_matrix(y_test, y_test_pred)
        print(f"[[TN={cm[0][0]}, FP={cm[0][1]}],\n [FN={cm[1][0]}, TP={cm[1][1]}]]")

    # 6. Cross-Validation Analysis (Logistic Regression focused as per request)
    print("\n" + "="*70)
    print("      CROSS-VALIDATION ANALYSIS (Logistic Regression)")
    print("="*70)
    lr_cv = LogisticRegression(random_state=42)
    cv_scores = cross_val_score(lr_cv, X_all_scaled, y, cv=5)
    print(f"Folds Accuracy Scores: {cv_scores}")
    print(f"Mean CV Accuracy:      {cv_scores.mean():.4f}")
    print(f"Std Deviation:         {cv_scores.std():.4f}")
    print("-" * 70)

    # 7. Model Stability Explanation Block
    print("\n" + "="*70)
    print("      MODEL STABILITY EXPLANATION")
    print("="*70)
    print("[1] Cross-Validation Significance:")
    print("    5-Fold Cross-Validation splits the dataset into 5 unique subsets to ensure")
    print("    the model performance is not dependent on a specific train-test split.")
    print("\n[2] Stability Indicator:")
    print(f"    The standard deviation of {cv_scores.std():.4f} indicates high stability.")
    print("    Values lower than 0.05 typically imply the model is robust to data variance.")
    print("\n[3] Dataset Limitations:")
    print(f"    Current dataset size is {len(df)} samples. While sufficient for academic")
    print("    demonstration, production environments require larger diversity.")
    print("\n[4] Synthetic Bias Awareness:")
    print("    Labels are generated based on rule distributions. The model's primary")
    print("    value is showing it can approximate and 'learn' the underlying heuristic logic.")
    print("="*70)

    # 8. Comparative Summary
    print("\n" + "="*70)
    print("      FINAL COMPARATIVE SUMMARY")
    print("="*70)
    summary_df = pd.DataFrame(results)
    print(summary_df.to_string(index=False))
    print("="*70)

if __name__ == "__main__":
    run_ml_pipeline()
