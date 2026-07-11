# SpendSight 

SpendSight is an intelligent, AI-powered personal finance and budgeting dashboard designed to help you track expenses, visualize spending trends, and accurately predict your financial future using machine learning.

## Features 

*   **Intelligent Dashboard:** View your cumulative spending, daily averages, and highest spending categories at a glance with a sleek, premium dark-mode interface.
*   **Machine Learning Budget Forecast:** Uses linear regression (powered by Python, Pandas, and NumPy) to calculate your spending velocity and mathematically predict your end-of-week and end-of-month spend.
*   **Dynamic Budget Health:** Automatically alerts you if your spending trajectory is "On Track" (Green), "At Risk" (Yellow), or "Over Budget" (Red).
*   **Snap & Log AI:** Not just for receipts! Snap a picture of any object, and the AI will analyze it, validate if it's a purchasable item, estimate its details, and automatically log the expense.
*   **Voice Logging:** Log expenses hands-free. Just say what you bought and how much it cost, and the AI will parse your speech into a structured transaction.
*   **AI Financial Assistant:** A built-in chat interface where you can ask questions about your spending habits, and the AI will provide personalized insights based on your database history.
*   **Wallet & Bank Linking:** Manage your current balances, top up your wallet, and track your financial stamina.

## Tech Stack 🛠️

*   **Frontend:** React, Vanilla CSS (Glassmorphism & Micro-animations)
*   **Backend:** Node.js, Express.js
*   **Database:** PostgreSQL
*   **AI / Analytics Engine:** Python 3, Pandas, NumPy
*   **Generative AI:** Gemini API (Vision, Text-to-Text, and Audio processing)

## Getting Started 

### Prerequisites
*   Node.js (v18 or higher)
*   Python 3.x (with `pandas` and `numpy` installed)
*   PostgreSQL
*   Gemini API Key

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ennovie23/SpendSight.git
    cd SpendSight
    ```

2.  **Set up the environment variables:**
    Create a `.env` file in the root directory and add the following:
    ```env
    DATABASE_URL=postgres://user:password@localhost:5432/spendsight
    GEMINI_API_KEY=your_gemini_api_key_here
    PORT=5001
    ```

3.  **Install dependencies:**
    
    *Root dependencies:*
    ```bash
    npm install
    ```
    
    *Frontend dependencies:*
    ```bash
    cd frontend
    npm install
    cd ..
    ```
    
    *Backend dependencies:*
    ```bash
    cd backend
    npm install
    cd ..
    ```

### Running the Application

SpendSight uses `concurrently` to run both the frontend and backend simultaneously.

From the root directory, simply run:
```bash
npm start
```

*   The **Frontend** will be available at `http://localhost:5173`
*   The **Backend** will be available at `http://localhost:5001`

## How the AI Works 

SpendSight doesn't just show you what you've spent; it predicts what you *will* spend. 

Whenever you log a transaction, the Node.js backend spawns a Python process that queries your PostgreSQL database. Using `numpy.polyfit()`, the system calculates a linear regression line based on your cumulative spending over the week or month. It correctly handles timezone offsets (converting UTC to local time) and pads non-spending days with zeros to calculate your exact spending velocity (slope) and starting offset (y-intercept).

If your predicted spend exceeds your historical average, the dashboard dynamically updates to warn you!

## License 📄
This project is for personal use and portfolio demonstration.
