import { Check, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, type Lang } from "@/lib/i18n";

const OPTIONS: { code: Lang; label: string }[] = [
  { code: "EN", label: "English" },
  { code: "TR", label: "Türkçe" },
  { code: "AR", label: "العربية" },
  { code: "KU", label: "Kurdî" },
];

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white transition-all hover:border-[#D0A36D] hover:text-[#D0A36D] focus:outline-none"
        aria-label="Select language"
      >
        <Globe className="h-4 w-4 transition-colors group-hover:text-[#D0A36D]" />
        <span>{lang}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[10rem] border-white/10 bg-[#111111] text-white p-2 rounded-2xl shadow-2xl"
      >
        {OPTIONS.map((o) => {
          const active = o.code === lang;
          return (
            <DropdownMenuItem
              key={o.code}
              onSelect={() => setLang(o.code)}
              className="flex cursor-pointer items-center justify-between gap-3 text-sm px-3 py-2 rounded-xl focus:bg-[#D0A36D]/10 focus:text-[#D0A36D] transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="inline-flex h-5 w-7 items-center justify-center rounded border border-white/10 bg-[#151515] text-[10px] font-bold tracking-wider text-white/80">
                  {o.code}
                </span>
                <span className="font-medium">{o.label}</span>
              </span>
              {active && <Check className="h-4 w-4 text-[#D0A36D]" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
