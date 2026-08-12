import fs from 'fs';

const file = 'src/routes/dashboard.finance.tsx';
let content = fs.readFileSync(file, 'utf8');

// The exact string to replace in addSchoolMutation
const targetAdd1 = `  const addSchoolMutation = useMutation({
    mutationFn: async (input: { name: string; currency: string; taken: number; rest: number }) => {`;
const repAdd1 = `  const addSchoolMutation = useMutation({
    mutationFn: async (input: { name: string; currency: string; rest: number }) => {`;
    
const targetAdd2 = `      if (input.taken > 0) {
        await supabaseClient.from("school_transactions").insert({
          school_id: school.id, transaction_type: "debt", amount: input.taken, description: "İlk Borç Kaydı", currency: input.currency
        });
      }`;
const repAdd2 = ``;

// The exact string to replace in editSchoolMutation
const targetEdit1 = `  const editSchoolMutation = useMutation({
    mutationFn: async (input: { id: string; name: string; currency: string; takenDiff: number; restDiff: number }) => {`;
const repEdit1 = `  const editSchoolMutation = useMutation({
    mutationFn: async (input: { id: string; name: string; currency: string; restDiff: number }) => {`;

const targetEdit2 = `      if (input.takenDiff !== 0) {
        await supabaseClient.from("school_transactions").insert({
          school_id: input.id, transaction_type: "debt", amount: input.takenDiff, description: "Bakiye Düzenlemesi (Borç)", currency: input.currency
        });
      }`;
const repEdit2 = ``;

content = content.replace(targetAdd1, repAdd1);
content = content.replace(targetAdd2, repAdd2);
content = content.replace(targetEdit1, repEdit1);
content = content.replace(targetEdit2, repEdit2);

fs.writeFileSync(file, content, 'utf8');
console.log("Patched school mutations perfectly.");
