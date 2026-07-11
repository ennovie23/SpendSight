import numpy as np
cumulative_spend = [4690.94, 5182.16, 14245.48, 15062.97]
days = np.arange(1, len(cumulative_spend) + 1)
m, c = np.polyfit(days, cumulative_spend, 1)
print(f"Pred: {(m * 7) + c}")
