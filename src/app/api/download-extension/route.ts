import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const extensionPath = path.join(process.cwd(), 'devmri-extension');
    
    if (!fs.existsSync(extensionPath)) {
      return NextResponse.json({ error: 'Extension not found' }, { status: 404 });
    }

    const entries = fs.readdirSync(extensionPath);
    const files = entries.map(name => ({
      name,
      isDirectory: fs.statSync(path.join(extensionPath, name)).isDirectory()
    }));
    
    return NextResponse.json({ files, path: extensionPath });
  } catch {
    return NextResponse.json({ error: 'Failed to prepare extension' }, { status: 500 });
  }
}
