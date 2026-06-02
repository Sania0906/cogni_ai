import { Router } from "express";

const router = Router();

router.get("/android-vs-web", (req, res) => {
  return res.json({
    metrics: [
      { name: "Active Users (Daily)", android: 15400, web: 24800, unit: "users" },
      { name: "Average Page Load Speed", android: 1.2, web: 0.85, unit: "seconds" },
      { name: "Crash/Error Rate", android: 0.12, web: 0.04, unit: "%" },
      { name: "Average Session Length", android: 14.5, web: 11.2, unit: "minutes" },
      { name: "Retention Rate (Day 7)", android: 45, web: 32, unit: "%" },
      { name: "Subscription Conversion Rate", android: 4.8, web: 3.2, unit: "%" }
    ],
    platformGrowth: [
      { month: "Jan", android: 8000, web: 15000 },
      { month: "Feb", android: 9500, web: 16800 },
      { month: "Mar", android: 11200, web: 18900 },
      { month: "Apr", android: 13000, web: 21000 },
      { month: "May", android: 15400, web: 24800 }
    ],
    geographicStats: [
      { country: "United States", android: 40, web: 60 },
      { country: "India", android: 75, web: 25 },
      { country: "Germany", android: 35, web: 65 },
      { country: "United Kingdom", android: 38, web: 62 },
      { country: "Brazil", android: 82, web: 18 }
    ]
  });
});

export default router;
