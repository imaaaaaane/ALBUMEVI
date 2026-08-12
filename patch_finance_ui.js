import fs from 'fs';

const file = 'src/routes/dashboard.finance.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. addSchoolMutation
content = content.replace(
  `mutationFn: async (input: { name: string; currency: string; taken: number; rest: number }) => {`,
  `mutationFn: async (input: { name: string; currency: string; rest: number }) => {`
);
content = content.replace(
  `      if (input.taken > 0) {
        await supabaseClient.from("school_transactions").insert({
          school_id: school.id, transaction_type: "debt", amount: input.taken, description: "İlk Borç Kaydı", currency: input.currency
        });
      }`,
  ``
);

// 2. editSchoolMutation
content = content.replace(
  `mutationFn: async (input: { id: string; name: string; currency: string; takenDiff: number; restDiff: number }) => {`,
  `mutationFn: async (input: { id: string; name: string; currency: string; restDiff: number }) => {`
);
content = content.replace(
  `      if (input.takenDiff !== 0) {
        await supabaseClient.from("school_transactions").insert({
          school_id: input.id, transaction_type: "debt", amount: input.takenDiff, description: "Bakiye Düzenlemesi (Borç)", currency: input.currency
        });
      }`,
  ``
);

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

// 5. Remove 'taken' UI from Add Modal
const targetAddUI = `            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen (İlk) {getCurrencySymbol(newSchoolCurrency)}</Label>
                <Input type="number" min="0" placeholder="0" value={newSchoolRest} onChange={(e) => setNewSchoolRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Borçlanma (İlk) {getCurrencySymbol(newSchoolCurrency)}</Label>
                <Input type="number" min="0" placeholder="0" value={newSchoolTaken} onChange={(e) => setNewSchoolTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
            </div>`;
const repAddUI = `            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Ödenen (İlk) {getCurrencySymbol(newSchoolCurrency)}</Label>
              <Input type="number" min="0" placeholder="0" value={newSchoolRest} onChange={(e) => setNewSchoolRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
            </div>`;
content = content.replace(targetAddUI, repAddUI);

// 6. Remove 'taken' UI from Edit Modal
const targetEditUI = `            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen (Toplam) {getCurrencySymbol(editSchoolCurrency)}</Label>
                <Input type="number" min="0" value={editSchoolRest} onChange={(e) => setEditSchoolRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Borçlanma (Toplam) {getCurrencySymbol(editSchoolCurrency)}</Label>
                <Input type="number" min="0" value={editSchoolTaken} onChange={(e) => setEditSchoolTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
            </div>`;
const repEditUI = `            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Ödenen (Toplam) {getCurrencySymbol(editSchoolCurrency)}</Label>
              <Input type="number" min="0" value={editSchoolRest} onChange={(e) => setEditSchoolRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
            </div>`;
content = content.replace(targetEditUI, repEditUI);

// 7. Change setNewTxType in İşlem Ekle button
content = content.replace(
  `onClick={() => { setNewTxType("debt"); setIsAddTxOpen(true); }}`,
  `onClick={() => { setNewTxType("payment"); setIsAddTxOpen(true); }}`
);

// 8. Remove İşlem Tipi selector in Add Tx Modal
const targetTxTypeUI = `            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">İşlem Tipi</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setNewTxType("debt")} className={\`h-11 rounded-xl font-bold text-xs border \${newTxType === "debt" ? "bg-[#A67C52]/10 border-[#A67C52] text-[#A67C52]" : "bg-white/5 border-white/5 text-[#9E9696]"}\`}>Borç Ekle</button>
                <button type="button" onClick={() => setNewTxType("payment")} className={\`h-11 rounded-xl font-bold text-xs border \${newTxType === "payment" ? "bg-[#12B76A]/10 border-[#12B76A] text-[#12B76A]" : "bg-white/5 border-white/5 text-[#9E9696]"}\`}>Ödeme Yapıldı</button>
              </div>
            </div>`;
content = content.replace(targetTxTypeUI, ``);

fs.writeFileSync(file, content, 'utf8');
console.log("Patched UI completely.");
