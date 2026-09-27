// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const MASTER_SECRET_KEY = Deno.env.get("MASTER_SECRET_KEY") || "your-secret-key-here";

serve(async (req) => {
  // Check for secret key in headers
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.split(" ")[1];
  if (token !== MASTER_SECRET_KEY) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Mock data - replace with actual database queries
  const data = {
    total_sales: 45230,
    recent_orders: [
      { id: "1", customer: "Rohit Sharma", amount: 2499, date: "2024-06-03" },
      { id: "2", customer: "Priya Patel", amount: 999, date: "2024-06-02" },
      { id: "3", customer: "Amit Singh", amount: 499, date: "2024-06-01" },
    ],
    top_selling_categories: [
      { name: "Tech & AI", sales: 15000 },
      { name: "Education", sales: 12000 },
      { name: "UI Themes & Scripts", sales: 10000 },
    ],
    system_alerts: [],
  };

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  );
})
