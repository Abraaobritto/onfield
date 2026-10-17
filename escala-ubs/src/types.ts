export interface USF {
  id: number;
  nome: string;
  porte: string;
  lat: number;
  lng: number;
  endereco: string;
  prioridade: 'Alta' | 'Média' | 'Baixa';
  ultimaVisita?: string;
}

export interface Tecnico {
  id: number;
  nome: string;
  endereco: string;
  lat: number;
  lng: number;
}

export interface Escala {
  id: string;
  tecnicoId: number;
  tecnicoNome: string;
  ubsId: number;
  ubsNome: string;
  dataInicio: string;
  dataFim: string;
  dias: number;
}