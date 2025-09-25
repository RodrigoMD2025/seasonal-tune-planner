import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const formatDate = (date: Date | string, pattern: string = "dd/MM/yyyy") => {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, pattern, { locale: ptBR });
};

export const formatDateRange = (startDate: Date | string, endDate: Date | string) => {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

export { ptBR };