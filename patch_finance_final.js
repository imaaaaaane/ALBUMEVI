import fs from 'fs';

const file = 'src/routes/dashboard.finance.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

let newLines = [];
let skipMutation = false;
let skipModal = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('const albumeviMutation = useMutation({')) {
    skipMutation = true;
  }
  
  if (skipMutation) {
    if (line.includes('  });') && lines[i-1].includes(' toast.error')) {
      skipMutation = false; // End of mutation block
    } else if (line.includes('  });') && (lines[i-1].includes('setAlbumeviForm') || lines[i-1].includes('setAlbumeviModalOpen'))) {
      // Actually it's probably around line 220
    }
    // We'll just carefully skip until `  });` that ends this mutation.
    // Let's rely on finding the end by looking a bit ahead.
  }

  if (line.includes('{/* Albumevi Sales Modal */}')) {
    skipModal = true;
  }

  if (skipModal) {
    if (line.includes('      </Dialog>')) {
      // Wait, there might be multiple </Dialog>.
      // Let's just do it manually with a better approach below.
    }
  }
}
