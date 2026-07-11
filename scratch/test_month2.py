import numpy as np
monthly_days = np.arange(1, 10)
monthly_cum = [0, 0, 0, 0, 0, 4690.94, 5182.16, 14245.48, 15062.97]
mm, mc = np.polyfit(monthly_days, monthly_cum, 1)
print(f"Monthly Pred (Day 31): {(mm * 31) + mc}")
