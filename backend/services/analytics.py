import pandas as pd
import numpy as np
import json
import sys

def main():
    # 1. Read the raw transaction JSON string passed from Node.js standard input
    input_data = sys.stdin.read()
    if not input_data:
        print(json.dumps({"error": "No data received"}))
        return

    raw_transactions = json.loads(input_data)
    
    # Safety Check: If the user has no transactions yet, return empty defaults
    if not raw_transactions:
        print(json.dumps({
            "total_spend": 0, 
            "weekly_average": 0, 
            "daily_average": 0,
            "highest_category": {"name": "None", "percentage": 0},
            "spending_breakdown": {}, 
            "detected_anomalies": []
        }))
        return

    # 2. Data Cleaning & Preparation
    df = pd.DataFrame(raw_transactions)
    df['date'] = pd.to_datetime(df['date'])
    df['amount'] = pd.to_numeric(df['amount'])

    # 3. Core Dashboard Analytics Math
    total_spend = float(df['amount'].sum())

    # Highest Category & Percentage logic
    if not df.empty and total_spend > 0:
        category_totals = df.groupby('category')['amount'].sum()
        highest_category = category_totals.idxmax()
        highest_cat_amount = category_totals.max()
        highest_cat_percentage = int((highest_cat_amount / total_spend) * 100)
        breakdown_dict = category_totals.to_dict()
    else:
        highest_category = "None"
        highest_cat_percentage = 0
        breakdown_dict = {}

    # Time-Series Resampling for true averages (handles days/weeks with zero spending)
    daily_series = df.set_index('date').resample('D')['amount'].sum().fillna(0)
    daily_average = round(float(daily_series.mean()), 2) if not daily_series.empty else 0

    weekly_series = df.set_index('date').resample('W')['amount'].sum().fillna(0)
    weekly_average = round(float(weekly_series.mean()), 2) if not weekly_series.empty else 0

    # Calculate monthly trends
    # Step 1: Extract Month Name from the date
    df['month_name'] = df['date'].dt.strftime('%B') # e.g., 'July', 'August'
    
    # Step 2: Group by the Month Name and sum the amounts
    # This creates a Series where the index is the month name and the value is the total spend
    monthly_series = df.groupby('month_name')['amount'].sum()
    
    # Step 3: Convert to dictionary
    monthly_trends_dict = monthly_series.to_dict()

    # 4. Outlier Detection using the Interquartile Range (IQR) Method
    anomalies = []
    if len(df) >= 4:
        q1 = df['amount'].quantile(0.25)
        q3 = df['amount'].quantile(0.75)
        iqr = q3 - q1
        upper_bound = q3 + (1.5 * iqr)
        
        # Filter rows that cross the upper threshold
        outliers_df = df[df['amount'] > upper_bound]
        
        # Convert the matching rows into a clean list of dictionaries
        for _, row in outliers_df.iterrows():
            anomalies.append({
                "amount": float(row['amount']),
                "category": row['category'],
                "date": row['date'].strftime('%Y-%m-%d')
            })

    # 5. Package into a clean JSON layout
    daily_trends_dict = {date_obj.strftime('%Y-%m-%d'): amount for date_obj, amount in daily_series.items()}
    
    dashboard_payload = {
        "total_spend": total_spend,
        "weekly_average": weekly_average,
        "daily_average": daily_average,
        "highest_category": {
            "name": highest_category,
            "percentage": highest_cat_percentage
        },
        "spending_breakdown": breakdown_dict,
        "monthly_trends": monthly_trends_dict,
        "daily_trends": daily_trends_dict,
        "detected_anomalies": anomalies
    }

    # Output ONLY the JSON string back to Node.js
    print(json.dumps(dashboard_payload))

if __name__ == "__main__":
    main()