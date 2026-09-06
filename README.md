# Eggbox repetitiebord

Statusbord voor `admin.eggbox.be`. Twee gebruikers, één vraag: *is iedereen
verbonden, en is er zonet iets vreemds gebeurd?*

De opdracht staat in `docs/dashboard-handoff.md` in de MAUI-repo; die blijft
daar. Hieronder alleen wat je nodig hebt om verder te werken.

## Draaien

```bash
npm install
npm run dev
```

`.env` bevat de Supabase-URL en de anon-sleutel. Meer is er niet: er is geen
eigen backend. De database bewaakt zichzelf met RLS en `public.is_admin()`, dus
een frontend met de anon-sleutel plus een ingelogde admin volstaat.

## Publiceren

`npm run generate` levert een statische SPA in `.output/public`. `netlify.toml`
staat al goed; `public/_redirects` stuurt elke diepe link naar `index.html`,
anders geeft `/bands/<id>` na een verversing een 404.

Twee dingen die je in Netlify zelf zet, niet in de repo:

- **Environment variables**: `SUPABASE_URL` en `SUPABASE_KEY` (de anon-sleutel).
- **Domein**: `admin.eggbox.be`, en dat adres daarna toevoegen bij Supabase onder
  *Authentication → URL Configuration → Redirect URLs*, anders komt niemand na
  het aanmelden met Google op het bord terug.

Deze repo is publiek. Daarom staat de hand-off er niet in en bevat
`.env.example` geen echte project-ref: die horen bij de MAUI-repo. Zet er ook
niets in dat een bandnaam of een lid noemt — de kleuren en namen op het scherm
komen uit de database, niet uit de code.

## Hoe het in elkaar zit

Nuxt met `ssr: false`. Alles zit achter een login, dus er valt niets te
renderen voor een bezoeker zonder sessie.

```
app/composables/useEggbox.ts        kleuren, tijd, dB — de vaste woordenschat
app/composables/useSentences.ts     event -> één zin in gewone taal
app/composables/useSettingsWords.ts PascalCase-velden -> leesbare namen
app/composables/useBoard.ts         de gegevens van het bord bij elkaar
app/pages/index.vue                 A. het bord
app/components/MeldingKaart.vue     B. de melding
app/pages/moment/[session].vue      B. wat er direct omheen gebeurde
app/pages/bands/                    C. bandenlijst en banddetail
app/pages/terugblik.vue             D. band + avond -> tijdlijn van iedereen
```

De taalregel zit in `useSentences.ts` en nergens anders. Op het bord staan geen
begrippen uit de codebase — geen *app-sessie*, geen *bus*, geen *flag*. Uit
`props` wordt alleen gelezen wat daar expliciet is opgesomd: er staat geen vrije
gebruikerstekst in de events, en zo houden we het.

Kanaalnamen zijn wél gebruikerstekst. Die staan daarom alleen op de
detailpagina van een band (waar ze het onderwerp zijn), nooit op het bord.

Het bord ververst zichzelf elke 20 seconden, en alleen als het tabblad
zichtbaar is.

## Aanmelden

Drie wegen naar binnen, alle drie op dezelfde accounts: Google, e-mail met
wachtwoord, en een aanmeldlink per mail. De Google-provider stond al ingesteld
op het project; `/confirm` vangt de terugkomst op, ook als die mislukt.

Wat wél moet kloppen: bij *Authentication → URL Configuration → Redirect URLs*
hoort `https://admin.eggbox.be/**` te staan, plus de poort waarop je lokaal
draait. Nuxt pakt 3000, maar schuift op naar 3001 als die bezet is, en de
terugkomst-URL volgt `window.location.origin` — zet daarom allebei in de lijst:

```
http://localhost:3000/**
http://localhost:3001/**
https://admin.eggbox.be/**
```

Zonder die vermelding stuurt Supabase de gebruiker na Google naar de Site URL in
plaats van naar het bord, zonder foutmelding.

## Wat er aan de database veranderd is

De migraties staan in de MAUI-repo onder `supabase/migrations`, want dat is de
plek waar dit schema wordt bijgehouden:

| Migratie | Waarom |
|---|---|
| `..101413_expose_admin_schema_to_authenticated` | Stap 3 uit de hand-off |
| `..101538_admin_views_usable_by_authenticated_admin` | `event_log_v` joinde `auth.users`; met `security_invoker` faalde dat voor élke ingelogde gebruiker, ook een admin. Nu via `admin.user_labels_v`. Ook: admin-policies op `band_members` en `recordings`, anders telde `band_overview_v` nul leden |
| `..101640_admin_band_views_require_admin` | De band-views leunen op `public.bands`, dat elke app-gebruiker mag lezen — een niet-admin zag daardoor wél rijen |
| `..101909_admin_guard_keeps_studio_access` | Die guard sloot ook Studio en `service_role` buiten |

`admin` moest ook bij de *exposed schemas* van PostgREST. Dat is gebeurd met

```sql
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, admin';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
```

**Zet het ook in Studio** onder *Settings → API → Exposed schemas*. De instelling
daar is de bron van waarheid voor het platform; blijft dat achter, dan kan een
configuratiewissel de rolinstelling hierboven overschrijven en valt het bord
zonder waarschuwing om.

Controleren dat het openstaat maar dicht is voor niet-ingelogden:

```bash
curl -s "$SUPABASE_URL/rest/v1/band_overview_v?select=band_name&limit=1" \
  -H "apikey: $ANON_KEY" -H "Accept-Profile: admin"
# verwacht: {"code":"42501", ... "permission denied for schema admin"}
```

### De rolwissel-controle

Na elke wijziging aan deze views opnieuw draaien. Alle views moeten voor een
admin rijen geven en voor een niet-admin nul, zonder fouten:

```sql
create temp table rc(who text, v text, n bigint, fout text) on commit drop;
do $$
declare r record; vw text; n bigint;
begin
  for r in
    select u.id, case when exists (select 1 from public.app_admins a where a.user_id=u.id)
                      then 'ADMIN' else 'NIET_ADMIN' end as who,
           row_number() over (partition by exists (select 1 from public.app_admins a where a.user_id=u.id)
                              order by u.created_at) as rn
    from auth.users u
  loop
    if r.rn > 1 then continue; end if;
    foreach vw in array array['event_log_v','band_overview_v','band_channels_v','band_buses_v',
                              'settings_versions_v','settings_changes_v','active_now_v',
                              'app_sessions_v','flag_unexplained','user_labels_v'] loop
      begin
        perform set_config('role','authenticated', true);
        perform set_config('request.jwt.claims',
                json_build_object('sub', r.id, 'role','authenticated')::text, true);
        execute format('select count(*) from admin.%I', vw) into n;
        perform set_config('role','none', true);
        insert into rc values (r.who, vw, n, null);
      exception when others then
        perform set_config('role','none', true);
        insert into rc values (r.who, vw, null, sqlerrm);
      end;
    end loop;
  end loop;
end $$;
select v, max(n) filter (where who='ADMIN') admin,
          max(n) filter (where who='NIET_ADMIN') niet_admin,
          string_agg(distinct fout,' / ') fouten
from rc group by v order by v;
```

## De vertragingsvraag staat nog open

De hand-off noemt dit blokkerend: hangt de telefoon aan de mixer-wifi zonder
uplink, dan blijven events in een lokale spool tot iemand weer internet heeft.
Op Android bindt `MixerIO` het hele proces aan de wifi (`Services/MixerIO.cs:112`),
dus ook de Supabase-verzoeken.

**Het antwoord staat inmiddels in de database, en het is niet het gunstige.**
Tijdens de sessie van 6 september 2026 kon één Android-toestel 21 minuten lang
de server niet bereiken:

| | |
|---|---|
| Eerste fout | DNS: *No address associated with hostname* |
| Daarna | 515 mislukte verzoeken, exact elke 5 seconden (twee pollers), plus twee van elke 63 s |
| Duur | 09:53 tot 10:14 UTC, onafgebroken |
| `is_online` | de hele tijd `true` — de app dacht dat ze online was |
| Aankomst | alle 556 events kwamen in één klap binnen om 10:14:54–10:14:55 |
| Vertraging | mediaan **10 min 46 s**, hoogste **21 min 28 s** |

Dat is exact het scenario uit de hand-off: gebonden aan de mixer-wifi zonder
uplink, terwijl de connectiviteitscheck online blijft melden. Mijn eerste meting
(mediaan 2,8 s) keek naar dezelfde sessie tóén de spool nog niet geleegd was en
zag daardoor alleen het verbonden begin — die uitkomst was misleidend.

**Gevolg: "live tijdens de repetitie" werkt niet.** Weg 1 uit de hand-off (het
bord als terugblik) is hiermee de realistische keuze; realtime aanzetten heeft
pas zin na weg 2, uplink op de Eggbox-hardware. Dat blijft een productbeslissing,
dus het bord is nog niet omgebouwd — het pollt en zegt eerlijk hoe oud de
gegevens zijn.

Meting herhalen:

```sql
select platform, count(*),
       min(delivery_lag), avg(delivery_lag), max(delivery_lag)
from admin.event_log_v
where occurred_at > now() - interval '7 days'
group by platform;
```

Tot dat antwoord er is doet het bord geen realtime-abonnement. Het pollt, en het
zegt onderaan het scherm wanneer de laatste gegevens binnenkwamen — als dat
lang geleden is, staat daar waarom. Blijkt de vertraging groot, dan is de
kleinste ingreep het bord tot terugblik verklaren (weg A uit de hand-off);
`events` in de `supabase_realtime`-publicatie zetten heeft pas zin bij weg 2.

## Valkuilen die hier ook gelden

- **Demo mode is overal weggefilterd** (`where not is_demo`). Test je met demo
  mode, dan is het scherm leeg en lijkt het stuk.
- **`color_value` 1 t/m 6 is meteen het busnummer.** De zes kleuren staan in
  `useEggbox.ts` en komen letterlijk uit `Models/Color.cs`.
- **Volgorde loopt op `seq`, niet op tijd.** Telefoonklokken springen. De
  tijdlijnfuncties sorteren al goed; het tijdvenster op `/moment` gebruikt wel
  de klok, want anders is er niets om op te filteren.
- **Negentig dagen bewaartermijn.** Een klacht over vier maanden geleden heeft
  geen tijdlijn meer.
- **Kanaalnummers zijn 1-based** (`Services/Mixer.cs:469`), net als busnummers.

## Waar de kleur van een lid vandaan komt

Uit het **instellingen-blob**, niet uit de events en niet uit `band_members`.
Bus 1 t/m 6 zíjn de zes kleuren, en `bus_name` is de naam die het lid bij het
instellen intypte. Een bus die nog zijn fabrieksnaam draagt (`BUS03`) is niet
geclaimd — dat is de enige test die je nodig hebt.

```sql
select b.band_name, b.bus as kleur, b.bus_name as lid,
       string_agg(c.channel_name || ' (' || c.channel || ')', ', ' order by c.channel) as instrumenten
from admin.band_buses_v b
left join admin.band_channels_v c on c.band_id = b.band_id and c.color_value = b.bus
where b.bus_name is not null
group by b.band_name, b.bus, b.bus_name
order by b.band_name, b.bus;
```

Op **kanalen** is `ColorMappedValue` het echte signaal: het zegt welk lid welk
instrument bezit. Dat is wat het banddetail interessant maakt — *het blauwe lid,
acht kanalen keyboard*. Op **bussen** is de kleur redundant met de index (vast
palet); wijkt dat af, dan is het blob niet geïnitialiseerd — dat zie je bij
testbands die nooit zijn ingesteld, en het is geen echt conflict.

Wat ontbreekt is alleen de koppeling naar een auth-account: `band_members.bus_index`
(`Models/DbModels.cs:122`) wordt door de app niet gevuld — de kleur leeft verder
op de telefoon in `Storage.MyBusIndex` (`Services/Storage.cs:63`). Voor het tonen
van kleuren heb je die koppeling niet nodig; de ledenlijst komt daarom uit
`band_buses_v` en niet uit `band_members`.

Op het bord staan mensen wél onder hun accountnaam (die komt uit de events).
Daar wordt de kleur gezocht via `events.color_value`, en anders via een match op
voornaam met de ingetypte busnaam — de voornaam alleen tegenover de volledige
accountnaam. Lukt ook dat niet, dan toont het een leeg rondje in plaats van een
grijze stip; grijs leest als een kleur.

## Nog te bouwen

**E. Acties** — sessie beëindigen, join-verzoek goedkeuren, instellingen
terugzetten. Als Edge Functions naar het model van
`supabase/functions/delete-account/index.ts`: service-role, JWT-geverifieerd,
met `is_admin()` in plaats van "eigen account". Het bord kan dit nu alleen
tonen, niet veranderen.
