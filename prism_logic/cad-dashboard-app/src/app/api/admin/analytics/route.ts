import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tqedzihlvsmolhaduntg.supabase.co";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Fetch all registered users from auth
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (userError) throw userError;

    const rawUsers = userData.users || [];

    let organizationCount = 0;
    let designerCount = 0;
    let otherCount = 0;

    const users = rawUsers.map((u) => {
      const meta = u.user_metadata || {};
      const role = meta.role || (meta.organization_name ? "organization" : "undetermined");

      if (role === "organization") organizationCount++;
      else if (role === "designer") designerCount++;
      else otherCount++;

      return {
        id: u.id,
        email: u.email,
        role,
        organizationName: meta.organization_name || meta.agency_name || null,
        fullName: meta.full_name || meta.name || (u.email || "").split("@")[0],
        whatsapp: meta.whatsapp || null,
        country: meta.country || null,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        emailConfirmed: !!u.email_confirmed_at,
      };
    });

    users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 2. Fetch Projects Summary
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, title, status, created_at, user_id, estimated_price, delivery_date")
      .order("created_at", { ascending: false });

    if (projectsError) console.error("[admin analytics] projects error:", projectsError);

    const projectList = projects || [];
    const totalProjects = projectList.length;

    const statusCounts: Record<string, number> = {};
    let totalEstimatedValue = 0;

    projectList.forEach((p) => {
      const s = p.status || "Pending";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
      if (p.estimated_price) {
        const num = parseFloat(String(p.estimated_price).replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) totalEstimatedValue += num;
      }
    });

    const completedProjects =
      (statusCounts["Completed"] || 0) +
      (statusCounts["completed"] || 0) +
      (statusCounts["Delivered"] || 0) +
      (statusCounts["delivered"] || 0);

    // 3. Fetch Portfolio items count
    const { count: portfolioCount, error: portfolioError } = await supabase
      .from("designer_portfolio_items")
      .select("*", { count: "exact", head: true });

    if (portfolioError) console.error("[admin analytics] portfolio error:", portfolioError);

    // 4. Fetch Designers Table count
    const { count: onboardedDesignersCount, error: designersError } = await supabase
      .from("designers")
      .select("*", { count: "exact", head: true });

    if (designersError) console.error("[admin analytics] designers table error:", designersError);

    // 5. Fetch Support tickets count
    const { count: ticketsCount } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: rawUsers.length,
        organizationCount,
        designerCount,
        otherCount,
        totalProjects,
        completedProjects,
        activeProjects: totalProjects - completedProjects,
        totalPortfolioItems: portfolioCount || 0,
        totalDesignersOnboarded: onboardedDesignersCount || 0,
        totalSupportTickets: ticketsCount || 0,
        totalEstimatedValue,
        statusCounts,
      },
      recentUsers: users.slice(0, 100),
      recentProjects: projectList.slice(0, 20),
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[admin analytics api] Error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
