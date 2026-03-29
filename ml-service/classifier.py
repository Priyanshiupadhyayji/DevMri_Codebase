"""
Flaky Build Classifier
Loads dataset from HuggingFace and trains RandomForest model
"""

import os
import re
import json
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
from datasets import load_dataset
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')


def engineer_features(log_text: str) -> dict:
    """
    Engineer features from build log text.
    
    Features:
    - log_length: Total length of log
    - step_count: Number of build steps
    - has_timeout: Boolean for timeout keywords
    - has_oom: Boolean for out-of-memory keywords
    - has_network_error: Boolean for network-related errors
    - has_flake_keyword: Boolean for flaky/intermittent/retry/random
    """
    if not log_text:
        log_text = ""
    
    text_lower = log_text.lower()
    
    # Feature 1: Log length
    log_length = len(log_text)
    
    # Feature 2: Step count (estimate from "step" or "job" occurrences)
    step_count = len(re.findall(r'(?:step|job|stage)[\s:]*\d+', text_lower))
    
    # Feature 3: Has timeout
    timeout_patterns = [
        r'timeout',
        r'timed?\s*out',
        r'exceeded?\s*(?:the\s+)?(?:execution\s+)?time',
        r'process\s+took\s+too\s+long',
    ]
    has_timeout = int(any(re.search(p, text_lower) for p in timeout_patterns))
    
    # Feature 4: Has OOM
    oom_patterns = [
        r'out\s*of\s*memory',
        r'oom',
        r'memory\s+(?:error|exhausted|exceeded)',
        r'cannot\s+allocate\s+memory',
        r'killed\s+(?:due\s+to\s+)?memory',
    ]
    has_oom = int(any(re.search(p, text_lower) for p in oom_patterns))
    
    # Feature 5: Has network error
    network_patterns = [
        r'network\s+(?:error|timeout|unavailable|refused)',
        r'connection\s+(?:refused|timeout|reset|failed)',
        r'dns\s+(?:error|lookup\s+failed)',
        r'econnrefused',
        r'etimedout',
        r'socket\s+(?:error|timeout)',
    ]
    has_network_error = int(any(re.search(p, text_lower) for p in network_patterns))
    
    # Feature 6: Has flake keyword
    flake_keywords = ['flaky', 'intermittent', 'retry', 'random']
    has_flake_keyword = int(any(kw in text_lower for kw in flake_keywords))
    
    return {
        'log_length': log_length,
        'step_count': step_count,
        'has_timeout': has_timeout,
        'has_oom': has_oom,
        'has_network_error': has_network_error,
        'has_flake_keyword': has_flake_keyword,
    }


def create_labels(df: pd.DataFrame) -> pd.Series:
    """
    Create labels: flaky=1 if sha_fail→sha_success with same test files,
    regression=0 otherwise
    """
    labels = []
    
    for idx, row in df.iterrows():
        # Simplified label logic based on commit patterns
        # In real dataset, would check sha_fail → sha_success transitions
        if row.get('is_flaky', False):
            labels.append(1)
        else:
            labels.append(0)
    
    return pd.Series(labels)


def load_and_prepare_data() -> tuple:
    """
    Load dataset from HuggingFace and prepare features/labels
    """
    print("Loading dataset from HuggingFace...")
    
    try:
        # Try to load from HuggingFace
        ds = load_dataset("JetBrains-Research/lca-ci-builds-repair", trust_remote_code=True)
        
        # Combine train/validation/test splits
        if isinstance(ds, dict):
            df = pd.concat([ds[k].to_pandas() for k in ds.keys()], ignore_index=True)
        else:
            df = ds.to_pandas()
        
        print(f"Loaded {len(df)} samples from HuggingFace")
        
    except Exception as e:
        print(f"Could not load from HuggingFace: {e}")
        print("Generating synthetic training data...")
        df = generate_synthetic_data()
    
    # Engineer features
    print("Engineering features...")
    features_list = []
    
    for log in df.get('log_text', df.get('logs', [])):
        if pd.isna(log):
            log = ""
        features_list.append(engineer_features(str(log)))
    
    X = pd.DataFrame(features_list)
    
    # Create labels
    if 'label' in df.columns:
        y = df['label'].fillna(0).astype(int)
    else:
        y = create_labels(df)
    
    return X, y, df


def generate_synthetic_data(n_samples: int = 1000) -> pd.DataFrame:
    """
    Generate synthetic training data when HuggingFace dataset is unavailable
    """
    np.random.seed(42)
    
    data = []
    
    for _ in range(n_samples):
        # Generate random log text with some patterns
        is_flaky = np.random.random() > 0.7  # 30% flaky
        
        log_parts = []
        
        if is_flaky:
            # Flaky logs tend to have certain patterns
            if np.random.random() > 0.5:
                log_parts.append("ERROR: Test failed randomly")
            if np.random.random() > 0.5:
                log_parts.append("WARNING: Flaky test detected")
            if np.random.random() > 0.6:
                log_parts.append("INFO: Retrying test case")
            if np.random.random() > 0.5:
                log_parts.append("ERROR: Intermittent network timeout")
            log_parts.append(f"Step {np.random.randint(1, 10)}: test")
        else:
            # Non-flaky logs
            if np.random.random() > 0.3:
                log_parts.append("Build completed successfully")
            if np.random.random() > 0.5:
                log_parts.append(f"Step {np.random.randint(1, 5)}: compile")
            log_parts.append("All tests passed")
        
        log_text = " | ".join(log_parts)
        
        data.append({
            'log_text': log_text,
            'is_flaky': is_flaky,
            'label': 1 if is_flaky else 0
        })
    
    return pd.DataFrame(data)


class FlakyClassifier:
    def __init__(self):
        self.model = None
        self.is_loaded = False
        self.feature_names = [
            'log_length', 'step_count', 'has_timeout', 
            'has_oom', 'has_network_error', 'has_flake_keyword'
        ]
    
    def load_or_train(self):
        """Load existing model or train new one"""
        if os.path.exists(MODEL_PATH):
            print("Loading existing model...")
            self.model = joblib.load(MODEL_PATH)
            self.is_loaded = True
        else:
            print("Training new model...")
            self.train()
            self.is_loaded = True
    
    def train(self):
        """Train the RandomForest classifier"""
        X, y, df = load_and_prepare_data()
        
        # Ensure we have features
        if X.empty:
            X = pd.DataFrame({
                'log_length': [0],
                'step_count': [0],
                'has_timeout': [0],
                'has_oom': [0],
                'has_network_error': [0],
                'has_flake_keyword': [0]
            })
            y = pd.Series([0])
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train RandomForest
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=5,  # Prevent overfitting
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        print(f"Model accuracy: {accuracy:.2%}")
        
        # Feature importance
        if hasattr(self.model, 'feature_importances_'):
            print("\nFeature importances:")
            for name, imp in sorted(zip(self.feature_names, self.model.feature_importances_), 
                                    key=lambda x: -x[1]):
                print(f"  {name}: {imp:.3f}")
        
        # Save model
        joblib.dump(self.model, MODEL_PATH)
        print(f"Model saved to {MODEL_PATH}")
    
    def predict(self, log_text: str) -> dict:
        """Predict if a build log is flaky"""
        if self.model is None:
            self.load_or_train()
        
        # Engineer features
        features = engineer_features(log_text)
        X = pd.DataFrame([features])
        
        # Predict
        prediction = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        
        is_flaky = bool(prediction)
        confidence = float(max(probabilities))
        
        # Generate reason based on features
        reasons = []
        if features['has_flake_keyword']:
            reasons.append("flaky/intermittent keywords detected")
        if features['has_timeout']:
            reasons.append("timeout patterns found")
        if features['has_oom']:
            reasons.append("memory issues detected")
        if features['has_network_error']:
            reasons.append("network errors present")
        if features['step_count'] > 10:
            reasons.append(f"high step count ({features['step_count']} steps)")
        
        reason = "; ".join(reasons) if reasons else "normal build patterns"
        
        return {
            "is_flaky": is_flaky,
            "confidence": confidence,
            "reason": reason
        }
