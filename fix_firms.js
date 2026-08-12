import fs from 'fs';

const file = 'src/routes/dashboard.finance.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix addFirmMutation
content = content.replace(
  `  const addFirmMutation = useMutation({
    mutationFn: async (input: { name: string; currency: string; rest: number }) => {
      const { data: supplier, error: sErr } = await supabaseClient
        .from("firms")
        .insert({ name: input.name, currency: input.currency })
        .select("id, name, currency")
        .single();
      if (sErr) throw sErr;

      if (input.taken > 0) {
        await supabaseClient.from("firm_transactions").insert({
          firm_id: supplier.id, transaction_type: "debt", amount: input.taken, description: "İlk Borç Kaydı", currency: input.currency
        });
      }`,
  `  const addFirmMutation = useMutation({
    mutationFn: async (input: { name: string; currency: string; taken: number; rest: number }) => {
      const { data: supplier, error: sErr } = await supabaseClient
        .from("firms")
        .insert({ name: input.name, currency: input.currency })
        .select("id, name, currency")
        .single();
      if (sErr) throw sErr;

      if (input.taken > 0) {
        await supabaseClient.from("firm_transactions").insert({
          firm_id: supplier.id, transaction_type: "debt", amount: input.taken, description: "İlk Borç Kaydı", currency: input.currency
        });
      }`
);

// Fix editFirmMutation
content = content.replace(
  `  const editFirmMutation = useMutation({
    mutationFn: async (input: { id: string; name: string; currency: string; restDiff: number }) => {
      await supabaseClient.from("firms").update({ name: input.name, currency: input.currency }).eq("id", input.id);
      if (input.takenDiff !== 0) {
        await supabaseClient.from("firm_transactions").insert({
          firm_id: input.id, transaction_type: "debt", amount: input.takenDiff, description: "Bakiye Düzenlemesi (Borç)", currency: input.currency
        });
      }`,
  `  const editFirmMutation = useMutation({
    mutationFn: async (input: { id: string; name: string; currency: string; takenDiff: number; restDiff: number }) => {
      await supabaseClient.from("firms").update({ name: input.name, currency: input.currency }).eq("id", input.id);
      if (input.takenDiff !== 0) {
        await supabaseClient.from("firm_transactions").insert({
          firm_id: input.id, transaction_type: "debt", amount: input.takenDiff, description: "Bakiye Düzenlemesi (Borç)", currency: input.currency
        });
      }`
);

// Fix handleAddFirm (if I modified it, though I probably didn't because I searched for newSchoolName, wait, let's check what I modified)
content = content.replace(
  `addFirmMutation.mutate({ name: newFirmName.trim(), currency: newFirmCurrency, rest: parseFloat(newFirmRest) || 0 });`,
  `addFirmMutation.mutate({ name: newFirmName.trim(), currency: newFirmCurrency, taken: parseFloat(newFirmTaken) || 0, rest: parseFloat(newFirmRest) || 0 });`
);

// Fix handleEditFirm (if I modified it)
content = content.replace(
  `    const currentRest = supplier.transactions.filter((tx) => tx.type === "payment").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const newRest = parseFloat(editFirmRest) || 0;
    editFirmMutation.mutate({
      id: editFirmId, name: editFirmName.trim(), currency: editFirmCurrency,
      restDiff: newRest - currentRest
    });`,
  `    const currentTaken = supplier.transactions.filter((tx) => tx.type === "debt").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const currentRest = supplier.transactions.filter((tx) => tx.type === "payment").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const newTaken = parseFloat(editFirmTaken) || 0;
    const newRest = parseFloat(editFirmRest) || 0;
    editFirmMutation.mutate({
      id: editFirmId, name: editFirmName.trim(), currency: editFirmCurrency,
      takenDiff: newTaken - currentTaken, restDiff: newRest - currentRest
    });`
);

fs.writeFileSync(file, content, 'utf8');
console.log("Firms fixed.");
