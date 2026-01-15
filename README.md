# Territorium

Aplicação de gerenciamento de mapas com React, Tailwind CSS e Supabase.

## Funcionalidades

- Gerenciamento de mapas com pontos e polígonos
- Dois níveis de acesso: Superintendente de Serviço e Dirigente
- Atribuição de mapas aos dirigentes
- Dashboard com insights sobre mapas trabalhados
- Mapa geral para visualização de todos os mapas

## Configuração

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
Crie um arquivo `.env` na raiz do projeto com:
```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
VITE_GOOGLE_MAPS_API_KEY=sua_chave_do_google_maps
```

**Nota sobre Google Maps:**
- Para usar Google Maps, você precisa de uma chave de API do Google Cloud Platform
- Obtenha sua chave em: https://console.cloud.google.com/google/maps-apis
- Habilite as APIs: "Maps JavaScript API" e "Maps Static API"
- Se não configurar a chave, o sistema usará OpenStreetMap como fallback

3. Execute o projeto:
```bash
npm run dev
```

## Estrutura do Banco de Dados

O projeto utiliza Supabase com as seguintes tabelas:
- `users` - Usuários do sistema
- `maps` - Mapas cadastrados
- `map_points` - Pontos nos mapas
- `map_polygons` - Polígonos nos mapas
- `map_assignments` - Atribuições de mapas aos dirigentes
- `map_visits` - Registro de visitas aos mapas pelos dirigentes








