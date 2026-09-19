import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tqedzihlvsmolhaduntg.supabase.co";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = params.id;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let authUserId = rawId;
    let designerProfile: any = null;

    try {
      const { data: { user } } = await supabase.auth.admin.getUserById(rawId);
      if (user?.id) {
        authUserId = user.id;
        const { data: records } = await supabase
          .from("designers")
          .select("*")
          .ilike("email", user.email || "")
          .limit(1);

        if (records && records.length > 0) {
          designerProfile = { ...records[0], email: user.email };
        } else {
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || (user.email || "").split("@")[0];
          designerProfile = { fullName, email: user.email, specialty: "", skills: [] };
        }
      }
    } catch (e) {
      console.error("[portfolio api] auth lookup failed:", e);
    }

    const { data: items, error } = await supabase
      .from("designer_portfolio_items")
      .select("*")
      .eq("designer_id", authUserId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ items: items || [], designer: designerProfile, authUserId });
  } catch (err: any) {
    console.error("[portfolio api] error:", err.message);
    return NextResponse.json({ items: [], designer: null, authUserId: params.id }, { status: 500 });
  }
}