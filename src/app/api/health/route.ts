import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Try a simple query to check database connection
    const { error } = await supabase
      .from("projects")
      .select("count")
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ 
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected"
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { 
        status: "error", 
        message: "Failed to connect to database",
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
