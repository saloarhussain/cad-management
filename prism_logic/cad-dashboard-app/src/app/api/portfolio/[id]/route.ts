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

    const cleanId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
    let authUserId = cleanId;
    let designerProfile: any = null;

    try {
      // 1. Try to find user by username in settings
      const { data: usernameMatch } = await supabase
        .from("settings")
        .select("user_id")
        .eq("username", cleanId)
        .limit(1);

      if (usernameMatch && usernameMatch.length > 0) {
        authUserId = usernameMatch[0].user_id;
      }

      // 2. Lookup auth user
      const { data: { user } } = await supabase.auth.admin.getUserById(authUserId);
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
        const username = s.username || null;

        designerProfile = {
          fullName,
          organizationName,
          avatarUrl,
          email: user.email,
          specialty,
          skills,
          username
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

    // Calculate total completed jobs from projects table
    let completedJobsCount = 0;
    try {
      const { data: projectsData } = await supabase
        .from("projects")
        .select("status")
        .eq("user_id", authUserId);

      if (projectsData && projectsData.length > 0) {
        completedJobsCount = projectsData.filter((p: any) => {
          const s = (p.status || "").toLowerCase();
          return s === "completed" || s === "delivered" || s === "approved" || s === "done";
        }).length;
        if (completedJobsCount === 0) completedJobsCount = projectsData.length;
      }
    } catch (jobErr) {
      console.error("[portfolio api] jobs count error:", jobErr);
    }

    return NextResponse.json({
      items: items || [],
      designer: designerProfile,
      authUserId,
      completedJobsCount
    });
  } catch (err: any) {
    console.error("[portfolio api] error:", err.message);
    return NextResponse.json({ items: [], designer: null, authUserId: rawId, completedJobsCount: 0 }, { status: 500 });
  }
}