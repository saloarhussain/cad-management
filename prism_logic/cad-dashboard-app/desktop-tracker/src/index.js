const { app, BrowserWindow, ipcMain, screen, desktopCapturer } = require('electron');
const path = require('node:path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = 'https://tqedzihlvsmolhaduntg.supabase.co';
const supabaseKey = 'sb_publishable_LBhc0ftR98VnaA0Vb32jPA_Wbp8luMj';
const supabase = createClient(supabaseUrl, supabaseKey);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // Handle Login
  ipcMain.handle('login', async (event, { email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  let isTracking = false;
  let activeSeconds = 0;
  let lastMousePosition = { x: 0, y: 0 };
  let trackIntervalId = null;
  let currentProjectId = null;

  // Handle Start Tracking
  ipcMain.handle('start-tracking', async (event, { projectId }) => {
    if (isTracking) return { success: false, error: 'Already tracking' };
    
    const activeWin = require('active-win');
    
    isTracking = true;
    activeSeconds = 0;
    currentProjectId = projectId;
    lastMousePosition = screen.getCursorScreenPoint();
    let checkCount = 0;
    
    trackIntervalId = setInterval(async () => {
      const currentPosition = screen.getCursorScreenPoint();
      let isMoving = false;
      if (currentPosition.x !== lastMousePosition.x || currentPosition.y !== lastMousePosition.y) {
        isMoving = true;
        lastMousePosition = currentPosition;
      }
      
      // Check Active Window
      let isCADApp = false;
      try {
        const win = await activeWin();
        if (win) {
          const windowTitle = win.title || '';
          const appName = win.owner?.name || '';
          const combined = (windowTitle + ' ' + appName).toLowerCase();
          
          if (combined.includes('matrix') || combined.includes('rhino') || combined.includes('zbrush')) {
            isCADApp = true;
          }
          console.log(`[TRACKER] Active Window: ${windowTitle} (${appName}) - CAD: ${isCADApp}`);
        }
      } catch (err) {
        console.error('[TRACKER] Error getting active window:', err.message);
      }

      // Only count time if moving AND in a CAD app!
      if (isMoving && isCADApp) {
        activeSeconds += 5;
      }
      
      checkCount++;
      // Take screenshot every 1 minute (12 checks of 5 seconds)
      if (checkCount >= 12) {
        checkCount = 0;
        try {
          const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
          if (sources.length > 0) {
            const imageBuffer = sources[0].thumbnail.toJPEG(80);
            
            const screenshotsDir = path.join(__dirname, 'screenshots');
            if (!fs.existsSync(screenshotsDir)) {
              fs.mkdirSync(screenshotsDir);
            }
            const filename = `screenshot_${Date.now()}.jpg`;
            fs.writeFileSync(path.join(screenshotsDir, filename), imageBuffer);
            
            console.log(`[TRACKER] Screenshot saved locally: ${filename}`);

            // Upload to Supabase Storage with projectId in path
            const { data, error } = await supabase.storage
              .from('project-assets')
              .upload(`screenshots/${projectId}/${filename}`, imageBuffer, {
                contentType: 'image/jpeg'
              });
              
            if (error) {
              console.error('[TRACKER] Failed to upload screenshot to Supabase:', error.message);
            } else {
              console.log(`[TRACKER] Screenshot uploaded to Supabase: ${data.path}`);
            }
          }
        } catch (err) {
          console.error('[TRACKER] Failed to capture screenshot:', err.message);
        }
      }
      
      console.log(`[TRACKER] Active seconds: ${activeSeconds}`);
    }, 5000);

    return { success: true };
  });

  // Handle Stop Tracking
  ipcMain.handle('stop-tracking', async (event) => {
    if (!isTracking) return { success: false, error: 'Not tracking' };
    
    isTracking = false;
    if (trackIntervalId) clearInterval(trackIntervalId);
    
    // Sync with Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('desktop_time_logs')
        .insert({
          user_id: user?.id,
          project_id: currentProjectId,
          active_seconds: activeSeconds,
          created_at: new Date().toISOString()
        });
        
      if (error) {
        console.warn('[TRACKER] Failed to insert into desktop_time_logs, using fallback.', error.message);
        // Fallback: Save to settings table in payment_methods JSON field
        if (user) {
          const { data: settings } = await supabase
            .from('settings')
            .select('payment_methods')
            .eq('user_id', user.id)
            .maybeSingle();
            
          const methods = settings?.payment_methods || [];
          methods.push({
            id: `timelog_${Date.now()}`,
            type: 'TIME_LOG',
            project_id: currentProjectId,
            active_seconds: activeSeconds,
            created_at: new Date().toISOString()
          });
          
          await supabase
            .from('settings')
            .update({ payment_methods: methods })
            .eq('user_id', user.id);
            
          console.log('[TRACKER] Time log saved to settings fallback.');
        }
      } else {
        console.log('[TRACKER] Time log saved to desktop_time_logs.');
      }
    } catch (err) {
      console.error('[TRACKER] Sync failed:', err.message);
    }
    
    return { success: true, activeSeconds };
  });

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
