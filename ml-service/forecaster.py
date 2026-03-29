"""
CI/CD Duration Forecaster
Uses Prophet for time series forecasting and maps to DX Score
"""

import os
import json
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
from prophet import Prophet
from sklearn.metrics import mean_absolute_error
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'prophet_model.pkl')


def duration_to_score(duration_seconds: float) -> float:
    """
    Map pipeline duration to DX Score
    Score = max(0, 100 - (duration_seconds / 60) * 8)
    
    Shorter builds = higher scores
    - 0 min: 100 score
    - 5 min: 60 score
    - 10 min: 20 score
    - 12.5+ min: 0 score
    """
    duration_minutes = duration_seconds / 60
    score = max(0, 100 - duration_minutes * 8)
    return round(score, 2)


class DurationForecaster:
    def __init__(self):
        self.model = None
        self.is_loaded = False
        self.historical_data = None
        self.training_data = None
    
    def load_or_train(self):
        """Load existing model or train new one"""
        if os.path.exists(MODEL_PATH):
            print("Loading existing Prophet model...")
            try:
                self.model = joblib.load(MODEL_PATH)
                self.is_loaded = True
            except Exception as e:
                print(f"Could not load model: {e}")
                print("Training new model...")
                self.train()
                self.is_loaded = True
        else:
            print("Training new Prophet model...")
            self.train()
            self.is_loaded = True
    
    def prepare_data(self, runs: list) -> pd.DataFrame:
        """
        Prepare time series data from run list
        
        Expected format: [{timestamp, duration_seconds, status}, ...]
        """
        data = []
        
        for run in runs:
            try:
                # Parse timestamp
                ts = run.get('timestamp', run.get('created_at', ''))
                if isinstance(ts, str):
                    # Handle ISO format
                    ts = pd.to_datetime(ts)
                elif isinstance(ts, (int, float)):
                    # Unix timestamp
                    ts = pd.to_datetime(ts, unit='s')
                
                duration = float(run.get('duration_seconds', run.get('duration', 0)))
                
                # Only use successful/completed runs for training
                status = run.get('status', run.get('conclusion', ''))
                if status in ['success', 'completed', 'completed'] or duration > 0:
                    data.append({
                        'ds': ts,
                        'y': duration
                    })
            except Exception as e:
                print(f"Skipping invalid run: {e}")
                continue
        
        if not data:
            # Generate sample data if no valid runs
            print("No valid runs provided, using sample data...")
            return self._generate_sample_data()
        
        df = pd.DataFrame(data)
        df = df.sort_values('ds').reset_index(drop=True)
        
        return df
    
    def _generate_sample_data(self) -> pd.DataFrame:
        """Generate sample training data"""
        np.random.seed(42)
        
        # Generate 90 days of sample data
        dates = pd.date_range(end=pd.Timestamp.now(), periods=90, freq='D')
        
        # Simulate realistic pipeline durations with some trend
        base_duration = 300  # 5 minutes
        durations = []
        
        for i, date in enumerate(dates):
            # Add some noise and occasional spikes
            duration = base_duration + np.random.normal(0, 60)
            
            # Add weekly pattern (weekends might have longer builds)
            if date.dayofweek >= 5:
                duration += 30
            
            # Add slow drift
            duration += i * 0.5
            
            # Occasional spikes (flaky tests)
            if np.random.random() < 0.1:
                duration += np.random.uniform(60, 180)
            
            durations.append(max(30, duration))  # Minimum 30 seconds
        
        df = pd.DataFrame({
            'ds': dates,
            'y': durations
        })
        
        return df
    
    def train(self):
        """Train Prophet model on historical data"""
        # Generate sample data for initial training
        self.training_data = self._generate_sample_data()
        
        # Create and configure Prophet model
        self.model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,
            seasonality_mode='multiplicative'
        )
        
        # Add custom seasonality for build patterns
        self.model.add_seasonality(
            name='build_pattern',
            period=30,
            fourier_order=3
        )
        
        # Fit model
        self.model.fit(self.training_data)
        
        # Save model
        joblib.dump(self.model, MODEL_PATH)
        print(f"Prophet model saved to {MODEL_PATH}")
    
    def forecast(self, runs: list) -> dict:
        """
        Forecast durations and map to DX Score
        
        Returns:
        - forecast: List of {date, predicted_score, lower, upper}
        - mae: Mean Absolute Error on historical data
        - days_until_grade_d: Days until DX Score drops to D (< 40)
        """
        if self.model is None:
            self.load_or_train()
        
        # Prepare historical data
        historical_df = self.prepare_data(runs)
        
        if len(historical_df) < 7:
            # Not enough data, use sample
            historical_df = self._generate_sample_data()
        
        # Calculate MAE on historical data (using last 20% as test)
        if len(historical_df) > 10:
            train_size = int(len(historical_df) * 0.8)
            train_df = historical_df[:train_size]
            test_df = historical_df[train_size:]
            
            if len(test_df) > 0:
                # Fit temporary model for evaluation
                temp_model = Prophet(
                    yearly_seasonality=False,
                    weekly_seasonality=True,
                    daily_seasonality=False
                )
                temp_model.fit(train_df)
                
                forecast_test = temp_model.predict(test_df[['ds']])
                mae = mean_absolute_error(test_df['y'], forecast_test['yhat'])
            else:
                mae = 0.0
        else:
            mae = 0.0
        
        # Create future dataframe for 30 days
        future = self.model.make_future_dataframe(periods=30)
        
        # Generate forecast
        forecast = self.model.predict(future)
        
        # Get last historical date
        last_date = historical_df['ds'].max()
        
        # Filter to future predictions
        future_forecast = forecast[forecast['ds'] > last_date].copy()
        
        # Convert to response format
        forecast_points = []
        
        for _, row in future_forecast.iterrows():
            date_str = row['ds'].strftime('%Y-%m-%d')
            predicted_duration = max(30, row['yhat'])  # Ensure positive duration
            lower_duration = max(30, row['yhat_lower'])
            upper_duration = row['yhat_upper']
            
            predicted_score = duration_to_score(predicted_duration)
            lower_score = duration_to_score(upper_duration)  # Invert for confidence band
            upper_score = duration_to_score(lower_duration)
            
            forecast_points.append({
                'date': date_str,
                'predicted_score': round(predicted_score, 2),
                'lower': round(upper_score, 2),  # Inverted for visual
                'upper': round(lower_score, 2)
            })
        
        # Calculate days until Grade D (score < 40)
        current_score = duration_to_score(historical_df['y'].iloc[-1]) if len(historical_df) > 0 else 70
        
        days_until_grade_d = 999
        
        for i, point in enumerate(forecast_points):
            if point['predicted_score'] < 40:
                days_until_grade_d = i + 1
                break
        
        # If current score is already below 40
        if current_score < 40:
            days_until_grade_d = 0
        
        return {
            'forecast': forecast_points,
            'mae': round(mae / 60, 2),  # Convert to minutes
            'days_until_grade_d': days_until_grade_d
        }
    
    def add_training_data(self, runs: list):
        """Add new runs to training data and optionally retrain"""
        new_data = self.prepare_data(runs)
        
        if self.training_data is None:
            self.training_data = new_data
        else:
            # Append new data
            self.training_data = pd.concat([self.training_data, new_data], ignore_index=True)
            self.training_data = self.training_data.drop_duplicates(subset=['ds'])
            self.training_data = self.training_data.sort_values('ds').reset_index(drop=True)
        
        # Retrain with new data
        self.train()
