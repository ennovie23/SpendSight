import pandas as pd
import numpy as np
import json
import sys
import calendar

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
                "date": row['date'].strftime('%Y-%m-%d'),
                "merchant": str(row.get('merchant', '')) if pd.notnull(row.get('merchant')) else '',
                "receipt_url": str(row.get('receipt_url', '')) if pd.notnull(row.get('receipt_url')) else '',
                "notes": str(row.get('notes', '')) if pd.notnull(row.get('notes')) else '',
                "bank_name": str(row.get('bank_name', '')) if pd.notnull(row.get('bank_name')) else ''
            })

    # ML Prediction for Weekly Budget Health
    # We initialize our starting values.
    predicted_end_of_week_spend = 0
    current_weekly_spend = 0
    budget_health_status = "On Track"

    # We only run the ML model if you actually have transactions and a historical average.
    if not df.empty and weekly_average > 0:
        
        # 1. We find the very latest transaction date in your database.
        latest_date = df['date'].max()
        
        # 2. We filter out ALL transactions except the ones that happened in the SAME calendar week as your latest transaction.
        current_week_mask = df['date'].dt.isocalendar().week == latest_date.isocalendar().week
        current_week_df = df[current_week_mask]
        
        # 3. We calculate how much you've spent so far this week.
        current_weekly_spend = float(current_week_df['amount'].sum())
        
        # 4. We group the week's data by the "Day of the Week" (Monday = 0, Tuesday = 1... Sunday = 6)
        daily_spend = current_week_df.groupby(current_week_df['date'].dt.dayofweek)['amount'].sum()
        
        if not daily_spend.empty:
            # 5. We find what day it currently is (e.g. Wednesday = 2)
            max_day = daily_spend.index.max()
            
            # 6. We fill in any missing days with 0 (e.g. if you spent money Mon and Wed, we explicitly say Tuesday was 0)
            daily_spend = daily_spend.reindex(range(max_day + 1), fill_value=0)
            
            # 7. We calculate the CUMULATIVE spend. (Mon, Mon+Tue, Mon+Tue+Wed...)
            cumulative_spend = daily_spend.cumsum().values
            
            # 8. We create an X-axis for our graph (Day 1, Day 2, Day 3)
            days = np.arange(1, len(cumulative_spend) + 1)
            
            if len(days) > 1:
                # 9. THE MACHINE LEARNING MAGIC: We use numpy's polyfit to draw a "Line of Best Fit" through your cumulative spending data.
                # 'm' is the slope (how fast you are spending per day). 'c' is the starting point.
                m, c = np.polyfit(days, cumulative_spend, 1)
                
                # 10. We plug "Day 7" (Sunday) into our line equation (y = mx + c) to predict your total spend.
                # We use max() just in case the math predicts a number lower than what you've ALREADY spent (which is impossible).
                predicted_end_of_week_spend = max(current_weekly_spend, (m * 7) + c)
            else:
                # 11. If it's only Monday (1 day of data), we can't draw a line, so we just multiply Monday's spend by 7 as a rough guess.
                predicted_end_of_week_spend = cumulative_spend[0] * 7
                
            predicted_end_of_week_spend = round(float(predicted_end_of_week_spend), 2)
            
            # 12. We compare the AI's prediction against your historical average to decide if you get a Green, Yellow, or Red health bar!
            if predicted_end_of_week_spend > weekly_average:
                budget_health_status = "Over Budget"
            elif predicted_end_of_week_spend > weekly_average * 0.85:
                budget_health_status = "At Risk"
            else:
                budget_health_status = "On Track"


    weekly_budget_health = {
        "baseline_budget": weekly_average,
        "current_spend": round(current_weekly_spend, 2),
        "predicted_spend": predicted_end_of_week_spend,
        "status": budget_health_status
    }

    # ML Prediction for Monthly Forecast Chart
    monthly_forecast = {
        "history": [],
        "forecast": []
    }
    
    if not df.empty:
        # 1. We group all your transactions by the day of the month (e.g. all July 1st transactions together)
        daily_monthly_spend = df.groupby(df['date'].dt.day)['amount'].sum()
        
        if not daily_monthly_spend.empty:
            # 2. We find the latest day you spent money this month
            max_day_monthly = daily_monthly_spend.index.max()
            
            # 3. We fill in any missing days with 0 (so if you didn't spend on the 2nd, it explicitly says 0)
            daily_monthly_spend = daily_monthly_spend.reindex(range(1, max_day_monthly + 1), fill_value=0)
            
            # 4. We calculate a running total of your spending (Cumulative Sum)
            # E.g., Day 1: 500, Day 2: 2000 (500+1500), Day 3: 3000
            cumulative_monthly_spend = daily_monthly_spend.cumsum().values
            
            # 5. We create an X-axis for our graph (Day 1, Day 2, Day 3)
            monthly_days = np.arange(1, len(cumulative_monthly_spend) + 1)
            
            # 6. We save this exact history for the frontend's "Solid Blue Line"
            for d, val in zip(monthly_days, cumulative_monthly_spend):
                monthly_forecast["history"].append({"day": int(d), "spend": float(val)})
                
            # 7. We figure out how many days are in the current calendar month (e.g. 28, 30, or 31)
            latest_date_in_df = df['date'].max()
            _, days_in_month = calendar.monthrange(latest_date_in_df.year, latest_date_in_df.month)
            
            if len(monthly_days) > 1:
                # 8. THE MACHINE LEARNING MAGIC: We run a Linear Regression on your cumulative spending
                # This draws a "Line of Best Fit" to figure out your spending velocity (m) and starting offset (c)
                m_month, c_month = np.polyfit(monthly_days, cumulative_monthly_spend, 1)
                last_val = cumulative_monthly_spend[-1]
                
                # 9. Projecting the future! We loop through all remaining days of the month to draw the Dotted Purple Line
                for d in range(max_day_monthly + 1, days_in_month + 1):
                    # We plug each future day into our AI's formula (y = mx + c)
                    pred_val = (m_month * d) + c_month
                    
                    # We use max() to mathematically guarantee the AI never predicts you will un-spend money
                    pred_val = max(float(last_val), float(pred_val))
                    
                    monthly_forecast["forecast"].append({"day": int(d), "spend": pred_val})
                    last_val = pred_val
            elif len(monthly_days) == 1:
                # 10. If it's only the 1st of the month, we can't draw a line, so we just multiply Day 1's spend by each day as a rough guess
                val = float(cumulative_monthly_spend[0])
                for d in range(max_day_monthly + 1, days_in_month + 1):
                    pred_val = val * d
                    monthly_forecast["forecast"].append({"day": int(d), "spend": pred_val})

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
        "detected_anomalies": anomalies,
        "weekly_budget_health": weekly_budget_health,
        "monthly_forecast": monthly_forecast
    }

    # Output ONLY the JSON string back to Node.js
    print(json.dumps(dashboard_payload))

if __name__ == "__main__":
    main()