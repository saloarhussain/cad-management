import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { invoiceTemplate } from '@/lib/mailer';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const supabase = await createClient();
    
    // Ensure the user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fetch the project
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();

    if (!project) {
      return new NextResponse('Project not found', { status: 404 });
    }

    // Fetch client to get their name
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .or(`name.eq."${project.client}",companyName.eq."${project.client}"`)
      .maybeSingle();
      
    const clientName = client?.name || project.client || 'Client';

    // Fetch organization settings to populate "From" section
    const { data: settings } = await supabase
      .from('settings')
      .select('payment_methods')
      .eq('user_id', user.id)
      .maybeSingle();
      
    const systemConfig = settings?.payment_methods?.find((m: any) => m.id === 'system_config') || {};

    // Generate the HTML
    let html = invoiceTemplate(project, client, systemConfig);

    // If print=true is passed, inject a script to open the print dialog automatically
    const searchParams = request.nextUrl.searchParams;
    const isPrint = searchParams.get('print') === 'true';

    if (isPrint) {
      // Inject print script before closing body tag
      html = html.replace('</body>', '<script>window.onload = function() { window.print(); }</script></body>');
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    console.error('[Invoice API Error]:', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
