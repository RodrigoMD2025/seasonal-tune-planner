import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

export const formatDate = (date: Date | string, pattern: string = "dd/MM/yyyy") => {
  try {
    let dateObj: Date;
    if (typeof date === "string") {
      dateObj = parse(date, 'dd/MM/yyyy', new Date());
      if (isNaN(dateObj.getTime())) {
        dateObj = parseISO(date);
      }
    } else {
      dateObj = date;
    }

    if (isNaN(dateObj.getTime())) return "Data inválida";

    return format(dateObj, pattern, { locale: ptBR });
  } catch (error) {
    return "Data inválida";
  }
};

export const formatDateRange = (startDate: Date | string, endDate: Date | string) => {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

// Retorna o início da semana (domingo) para a data fornecida.
export const getStartOfWeek = (date: Date) => {
  return startOfWeek(date, { locale: ptBR, weekStartsOn: 0 }); // 0 para Domingo
};

// Retorna o fim da semana (sábado) para a data fornecida.
export const getEndOfWeek = (date: Date) => {
  return endOfWeek(date, { locale: ptBR, weekStartsOn: 0 }); // 0 para Domingo
};

// Verifica se uma data está dentro da semana atual (Dom-Sáb).
export const isDateInCurrentWeek = (date: Date | string) => {
  let dateObj: Date;

  if (typeof date === "string") {
    // Tenta primeiro o formato dd/MM/yyyy, que é o mais provável de ser salvo no DB.
    dateObj = parse(date, 'dd/MM/yyyy', new Date());
    // Se o parse falhar (resultando em data inválida), tenta o formato ISO.
    if (isNaN(dateObj.getTime())) {
      dateObj = parseISO(date);
    }
  } else {
    dateObj = date;
  }

  // Se a data ainda for inválida após as tentativas de parse, retorna falso.
  if (isNaN(dateObj.getTime())) {
    return false;
  }

  const today = new Date();
  const interval = {
    start: getStartOfWeek(today),
    end: getEndOfWeek(today),
  };
  return isWithinInterval(dateObj, interval);
};


export { ptBR };
