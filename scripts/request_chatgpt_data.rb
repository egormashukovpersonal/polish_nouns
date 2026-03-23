require "json"
require "csv"
require "httparty"
require "dotenv/load"
require "set"

API_URL = "https://api.openai.com/v1/chat/completions"
MODEL = "gpt-4.1"

nouns = [
  # ===== MASCULINE — BASIC / COMMON =====
  "kot",
  "pies",
  "dom",
  "stół",
  "las",
  "sad",
  "sklep",
  "telefon",
  "samochód",
  "rower",
  "zegar",
  "klucz",
  "chleb",
  "ser",
  "cukier",
  "ryż",
  "obiad",
  "ogród",
  "pokój",
  "brat",
  "syn",
  "ojciec",
  "mąż",
  "sąsiad",
  "student",
  "uczeń",
  "nauczyciel",
  "lekarz",
  "klient",
  "turysta",

  # ===== MASCULINE — ANIMATE / PERSON / ANIMAL =====
  "człowiek",
  "chłopiec",
  "mężczyzna",
  "kolega",
  "przyjaciel",
  "gość",
  "pilot",
  "aktor",
  "policjant",
  "pracownik",
  "robotnik",
  "rolnik",
  "żołnierz",
  "piesek",
  "kotek",
  "koń",
  "lew",
  "tygrys",
  "wilk",
  "ptak",

  # ===== MASCULINE — HARDER / ALTERNATIONS / IRREGULARITIES =====
  "ogień",
  "kamień",
  "dzień",
  "liść",
  "gwóźdź",
  "nóż",
  "mróz",
  "książę",
  "król",
  "przyjaciel",
  "bohater",
  "zwycięzca",
  "mieszkaniec",
  "obcokrajowiec",
  "sprzedawca",
  "kierowca",
  "artysta",
  "poeta",
  "dentysta",
  "koleżka",

  # ===== FEMININE — BASIC -A =====
  "kobieta",
  "mama",
  "siostra",
  "babcia",
  "ciocia",
  "dziewczyna",
  "szkoła",
  "ulica",
  "książka",
  "gazeta",
  "herbata",
  "kawa",
  "woda",
  "zupa",
  "ryba",
  "sałata",
  "praca",
  "nauka",
  "zabawa",
  "rozmowa",
  "podróż",
  "minuta",
  "godzina",
  "sekunda",
  "mapa",
  "torba",
  "walizka",
  "sukienka",
  "koszula",
  "łyżka",

  # ===== FEMININE — CONSONANT / SOFTER / HARDER =====
  "noc",
  "moc",
  "pomoc",
  "miłość",
  "radość",
  "kość",
  "wieś",
  "myśl",
  "sól",
  "krew",
  "brew",
  "twarz",
  "część",
  "młodość",
  "przyszłość",
  "wiadomość",
  "przeszłość",
  "odpowiedź",
  "powieść",
  "jesień",

  # ===== FEMININE — HARDER / STEM CHANGES / SPECIAL =====
  "ręka",
  "noga",
  "głowa",
  "ziemia",
  "imię? nie", # tylko jako separator myślowy, usuń jeśli nie chcesz komentarza w danych
  "matka",
  "córka",
  "żona",
  "pani",
  "koleżanka",
  "lekcja",
  "stacja",
  "informacja",
  "decyzja",
  "historia",
  "kuchnia",
  "łazienka",
  "sypialnia",
  "dziedzina",
  "rodzina",

  # ===== NEUTER — BASIC -O =====
  "okno",
  "drzewo",
  "auto",
  "jezioro",
  "miasto",
  "piwo",
  "jajko",
  "lustro",
  "krzesło",
  "biuro",
  "zdjęcie",
  "radio",
  "słońce",
  "miejsce",
  "pole",
  "morze",
  "serce",
  "zwierzę",
  "dziecko",
  "ramię",

  # ===== NEUTER — HARDER -E / -Ę / IRREGULAR =====
  "imię",
  "plemię",
  "księstwo",
  "życie",
  "pytanie",
  "jedzenie",
  "mieszkanie",
  "czytanie",
  "pisanie",
  "latanie",
  "marzenie",
  "ćwiczenie",
  "wydarzenie",
  "pokolenie",
  "zachowanie",
  "narzędzie",
  "przedmieście",
  "wejście",
  "wyjście",
  "szczęście",

  # ===== PLURAL-ONLY / USEFUL EDGE CASES =====
  "drzwi",
  "okulary",
  "spodnie",
  "nożyczki",
  "skrzypce",
  "wakacje",
  "ferie",
  "urodziny",
  "imieniny",
  "zawody",
  "narty",
  "szachy",
  "usta",
  "plecy",
  "ludzie",
  "państwo",
  "dzieje",
  "okolice",
  "peryferia",
  "finanse",

  # ===== SINGULAR-ONLY / MASS / ABSTRACT =====
  "mleko",
  "masło",
  "mięso",
  "żelazo",
  "złoto",
  "srebro",
  "miedź",
  "piasek",
  "śnieg",
  "deszcz",
  "wiatr",
  "dym",
  "ogień",
  "muzyka",
  "cisza",
  "hałas",
  "spokój",
  "zdrowie",
  "bieda",
  "wolność",

  # ===== FREQUENT ABSTRACTS =====
  "czas",
  "rok",
  "problem",
  "pomysł",
  "plan",
  "cel",
  "sposób",
  "powód",
  "wynik",
  "błąd",
  "prawo",
  "język",
  "prawda",
  "sprawa",
  "idea",
  "możliwość",
  "umiejętność",
  "potrzeba",
  "nadzieja",
  "decyzja",

  # ===== BODY PARTS =====
  "ręka",
  "noga",
  "głowa",
  "oko",
  "ucho",
  "nos",
  "usta",
  "zęb",
  "serce",
  "palec",
  "kolano",
  "ramię",
  "twarz",
  "włosy",
  "plecy",

  # ===== FOOD / EVERYDAY =====
  "jabłko",
  "banan",
  "pomidor",
  "ziemniak",
  "ogórek",
  "chleb",
  "masło",
  "mleko",
  "ser",
  "woda",
  "sok",
  "kawa",
  "herbata",
  "cukierek",
  "ciastko",
  "zupa",
  "ryż",
  "makaron",
  "mięso",
  "jajko",

  # ===== PLACES =====
  "dom",
  "mieszkanie",
  "pokój",
  "kuchnia",
  "łazienka",
  "biuro",
  "szkoła",
  "uczelnia",
  "sklep",
  "restauracja",
  "kawiarnia",
  "lotnisko",
  "dworzec",
  "przystanek",
  "ulica",
  "miasto",
  "wieś",
  "kraj",
  "plaża",
  "las",

  # ===== PROFESSION / SOCIAL =====
  "student",
  "uczeń",
  "nauczyciel",
  "lekarz",
  "pielęgniarka",
  "programista",
  "kierowca",
  "sprzedawca",
  "kelner",
  "kelnerka",
  "pracownik",
  "szef",
  "dyrektor",
  "inżynier",
  "artysta",
  "aktor",
  "policjant",
  "urzędnik",
  "sąsiad",
  "przyjaciel",

  # ===== TIME WORDS =====
  "dzień",
  "tydzień",
  "miesiąc",
  "rok",
  "godzina",
  "minuta",
  "sekunda",
  "chwila",
  "pora",
  "czas",
  "noc",
  "wieczór",
  "rano",
  "zima",
  "wiosna",
  "lato",
  "jesień",

  # ===== GOOD TRICKY WORDS FOR TESTING =====
  "człowiek",
  "dziecko",
  "imię",
  "zwierzę",
  "ramię",
  "książę",
  "gość",
  "liść",
  "kość",
  "wieś",
  "mysz",
  "sędzia",
  "hrabia",
  "poeta",
  "mężczyzna",
  "kobieta",
  "noc",
  "morze",
  "serce",
  "słońce"
]

DEST_DATA_FILE   = "data/result.json"

def generate_for_chatgpt(words)
  prompt = <<~PROMPT
    Ты анализируешь одно польское существительное для приложения по изучению польской грамматики.

    Твоя задача:
    - вернуть только полезные для обучения данные
    - не добавлять лишнюю лингвистическую теорию
    - не выводить объяснения вне JSON
    - не определять никакие группы склонения
    - не добавлять комментарии внутри JSON
    - использовать современный нормативный польский язык

    Важно:
    - род должен быть только одним из значений: "m", "f", "n"
    - animate должно быть true или false
    - animate ставь только по смыслу слова
    - flags.has_alternation = true, если в формах есть заметное чередование основы, например kot → kocie, pies → psa, morze → morza, imię → imienia
    - flags.has_irregular_plural = true, если множественное число образуется нестандартно или заметно выбивается
    - flags.is_regular = true, если слово склоняется по обычной ожидаемой модели без сильных сюрпризов
    - flags.is_difficult = true, если слово может быть неудобным или tricky для ученика из-за чередований, нестандартных форм или нетипичного поведения
    - верни все формы в liczba pojedyncza и liczba mnoga
    - если у слова нет естественного множественного числа или какая-то форма практически не употребляется, всё равно постарайся вернуть стандартную нормативную форму, если она существует
    - если есть очень редкий или спорный случай, выбери самый нейтральный и общеупотребительный вариант


    Верни ТОЛЬКО JSON-массив объектов. Без текста, без markdown.

    Каждый объект должен иметь СТРОГО такую структуру:

    {
      "polish_word": "string",
      "russian_word": "string",
      "gender": "m|f|n",
      "animate": true,
      "flags": {
        "is_regular": true,
        "has_alternation": false,
        "has_irregular_plural": false,
        "is_difficult": false
      },
      "singular": {
        "mianownik": "string",
        "dopelniacz": "string",
        "celownik": "string",
        "biernik": "string",
        "narzednik": "string",
        "miejscownik": "string",
        "wolacz": "string"
      },
      "plural": {
        "mianownik": "string",
        "dopelniacz": "string",
        "celownik": "string",
        "biernik": "string",
        "narzednik": "string",
        "miejscownik": "string",
        "wolacz": "string"
      }
    }

    Проанализируй слово: "#{words.join(", ")}"
    PROMPT

  response = HTTParty.post(
    API_URL,
    headers: {
      "Authorization" => "Bearer #{ENV['OPENAI_API_KEY']}",
      "Content-Type"  => "application/json"
    },
    body: {
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    }.to_json
  )

  content = response.dig("choices", 0, "message", "content")
  JSON.parse(content)
end

words = nouns

puts "Загружено слов: #{words.size}"

result_data =
  if File.exist?(DEST_DATA_FILE)
    JSON.parse(File.read(DEST_DATA_FILE))
  else
    []
  end

CHUNK_SIZE = 1
MAX_RETRIES = 5
RETRY_SLEEP = 5 # секунд

processed_chunks = (result_data.size.to_f / CHUNK_SIZE).floor

words.each_slice(CHUNK_SIZE).with_index do |chunk, index|
  next if index < processed_chunks

  retries = 0

  begin
    puts "→ Step #{index + 1} | total words: #{result_data.size}"

    generated = generate_for_chatgpt(chunk)

    # страховка от дублей
    existing = result_data.map { |w| w["polish_word"].downcase }.to_set
    generated.reject! { |w| existing.include?(w["polish_word"].downcase) }

    result_data.concat(generated)

    File.write(
      DEST_DATA_FILE,
      JSON.pretty_generate(result_data, ensure_ascii: false)
    )

    sleep 1.5

  rescue Net::ReadTimeout, Timeout::Error, Errno::ECONNRESET => e
    retries += 1
    puts "⏳ Timeout в чанке #{index + 1}, попытка #{retries}/#{MAX_RETRIES}"

    if retries <= MAX_RETRIES
      sleep RETRY_SLEEP * retries # backoff
      retry
    else
      puts "❌ Превышено число повторов в чанке #{index + 1}"
      break
    end

  rescue JSON::ParserError => e
    puts "❌ Некорректный JSON в чанке #{index + 1}: #{e.message}"
    break

  rescue => e
    puts "❌ Фатальная ошибка в чанке #{index + 1}: #{e.class} — #{e.message}"
    break
  end
end


puts "✅ Готово. Итоговых слов: #{result_data.size}"
