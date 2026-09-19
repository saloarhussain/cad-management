import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tqedzihlvsmolhaduntg.supabase.co";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  try {
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

        const { data: settings } = await supabase
          .from("settings")
          .select("*")
          .eq("user_id", authUserId)
          .limit(1);

        const s = settings?.[0] || {};
        const fullName =
          s.owner_name ||
          records?.[0]?.fullName ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email || "").split("@")[0];

        const organizationName = s.organization_name || user.user_metadata?.organization_name;
        const avatarUrl = s.avatar_url || records?.[0]?.avatar_url || user.user_metadata?.avatar_url;
        const specialty =
          records?.[0]?.specialty ||
          (user.user_metadata?.role === "admin" || user.user_metadata?.role === "organization"
            ? `${organizationName || "CAD Studio"} Portfolio`
            : "Professional 3D CAD Designer");

        const skills = records?.[0]?.skills || ["3D CAD Modeling", "Jewelry Design", "Rendering", "Rhino 3D"];

        designerProfile = {
          fullName,
          organizationName,
          avatarUrl,
          email: user.email,
          specialty,
          skills
        };
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
    return NextResponse.json({ items: [], designer: null, authUserId: rawId }, { status: 500 });
  }
}