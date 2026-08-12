import fs from 'fs';

const file = 'src/routes/dashboard.finance.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. addSchoolMutation
const targetAddSchool = `  const addSchoolMutation = useMutation({
    mutationFn: async (input: { name: string; currency: string; taken: number; rest: number }) => {
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError || !sessionData?.session) {
        throw new Error("Oturum bulunamadı. Lütfen sayfayı yenileyip tekrar giriş yapın.");
      }

      const { data: school, error: sErr } = await supabaseClient
        .from("schools")
        .insert({ name: input.name, currency: input.currency })
        .select("id, name, currency")
        .single();
      if (sErr) throw sErr;

      if (input.taken > 0) {
        await supabaseClient.from("school_transactions").insert({
          school_id: school.id, transaction_type: "debt", amount: input.taken, description: "İlk Borç Kaydı", currency: input.currency
        });
      }`;
const repAddSchool = `  const addSchoolMutation = useMutation({
    mutationFn: async (input: { name: string; currency: string; rest: number }) => {
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError || !sessionData?.session) {
        throw new Error("Oturum bulunamadı. Lütfen sayfayı yenileyip tekrar giriş yapın.");
      }

      const { data: school, error: sErr } = await supabaseClient
        .from("schools")
        .insert({ name: input.name, currency: input.currency })
        .select("id, name, currency")
        .single();
      if (sErr) throw sErr;`;
content = content.replace(targetAddSchool, repAddSchool);

// 2. editSchoolMutation
const targetEditSchool = `  const editSchoolMutation = useMutation({
    mutationFn: async (input: { id: string; name: string; currency: string; takenDiff: number; restDiff: number }) => {
      await supabaseClient.from("schools").update({ name: input.name, currency: input.currency }).eq("id", input.id);
      if (input.takenDiff !== 0) {
        await supabaseClient.from("school_transactions").insert({
          school_id: input.id, transaction_type: "debt", amount: input.takenDiff, description: "Bakiye Düzenlemesi (Borç)", currency: input.currency
        });
      }`;
const repEditSchool = `  const editSchoolMutation = useMutation({
    mutationFn: async (input: { id: string; name: string; currency: string; restDiff: number }) => {
      await supabaseClient.from("schools").update({ name: input.name, currency: input.currency }).eq("id", input.id);`;
content = content.replace(targetEditSchool, repEditSchool);

// 3. handleAddSchool
content = content.replace(
  `addSchoolMutation.mutate({ name: newSchoolName.trim(), currency: newSchoolCurrency, taken: parseFloat(newSchoolTaken) || 0, rest: parseFloat(newSchoolRest) || 0 });`,
  `addSchoolMutation.mutate({ name: newSchoolName.trim(), currency: newSchoolCurrency, rest: parseFloat(newSchoolRest) || 0 });`
);

// 4. handleEditSchool
content = content.replace(
  `    const currentTaken = school.transactions.filter((tx) => tx.type === "debt").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const currentRest = school.transactions.filter((tx) => tx.type === "payment").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const newTaken = parseFloat(editSchoolTaken) || 0;
    const newRest = parseFloat(editSchoolRest) || 0;
    editSchoolMutation.mutate({
      id: editSchoolId, name: editSchoolName.trim(), currency: editSchoolCurrency,
      takenDiff: newTaken - currentTaken, restDiff: newRest - currentRest
    });`,
  `    const currentRest = school.transactions.filter((tx) => tx.type === "payment").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const newRest = parseFloat(editSchoolRest) || 0;
    editSchoolMutation.mutate({
      id: editSchoolId, name: editSchoolName.trim(), currency: editSchoolCurrency,
      restDiff: newRest - currentRest
    });`
);

fs.writeFileSync(file, content, 'utf8');
console.log("Patched Schools perfectly.");
