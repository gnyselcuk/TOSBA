# 🎮 TOSBA - Application Flow Diagrams

> **Comprehensive Visualization**: Detailed Mermaid diagrams explaining all workflows of the TOSBA application.

## 📋 Table of Contents

1. [General Application Flow](#1-general-application-flow)
2. [Onboarding Process](#2-onboarding-process)
3. [Buddy Creation](#3-buddy-creation)
4. [Assessment System](#4-assessment-system)
5. [Curriculum Generation](#5-curriculum-generation)
6. [Game System](#6-game-system)
7. [Magic Homework Converter](#7-magic-homework-converter)
8. [AR-Lite Home Gallery](#8-ar-lite-home-gallery)
9. [AI Services](#9-ai-services)
10. [Data Flow](#10-data-flow)

---

## 1. GENERAL APPLICATION FLOW

Top-level flow showing all major components of the application.

```mermaid
graph TD
    Start[App Launch] --> CheckUser{"User<br/>Exists?"}
    
    CheckUser -->|No| Onboarding[Onboarding Process]
    CheckUser -->|Yes| Dashboard[Main Dashboard]
    
    Onboarding --> Interview[Parent Interview<br/>Gemini 3 Live]
    Interview --> PhotoSetup[Photo Setup<br/>4 Categories]
    PhotoSetup --> BuddyCreator[Buddy Creator<br/>Toy → Avatar]
    BuddyCreator --> BuddyActivation[Buddy Activation<br/>First Meeting]
    BuddyActivation --> Assessment[Assessment<br/>10 Questions]
    Assessment --> CurriculumGen[Curriculum Generation<br/>7 Day Plan]
    CurriculumGen --> Dashboard
    
    Dashboard --> GameArena[Game Arena]
    Dashboard --> ArtStudio[Magic Art Studio]
    Dashboard --> Shop[Shop Module]
    Dashboard --> Stories[Story Library]
    Dashboard --> Fusion[Fusion Workshop]
    Dashboard --> ParentPanel[Parent Panel]
    
    GameArena --> PlaySession[Play Session<br/>5 Questions]
    PlaySession --> Rewards[Earn Rewards<br/>+Stars]
    Rewards --> Dashboard
    
    ParentPanel --> HomeworkConv[Homework Converter]
    ParentPanel --> GalleryMgr[Gallery Manager]
    ParentPanel --> Performance[Performance Tracking]
    
    HomeworkConv --> TestGame[Test Game]
    TestGame --> AddToCurr[Add to Curriculum]
    AddToCurr --> Dashboard
    
    GalleryMgr --> ARLite[AR-Lite Game]
    ARLite --> Dashboard
    
    style Start fill:#e1f5ff
    style Dashboard fill:#fff4e1
    style BuddyCreator fill:#ffe1f5
    style HomeworkConv fill:#e1ffe1
    style ARLite fill:#ffe1e1
```

---

## 2. ONBOARDING PROCESS

Initial user registration and profile creation process.

```mermaid
graph LR
    Welcome[Welcome Screen] --> LiveAPI[Gemini 3 Live API<br/>Connection]
    LiveAPI --> Interview[Parent Interview]
    
    Interview --> Q1[Child Name/Age]
    Q1 --> Q2[Developmental Level]
    Q2 --> Q3[Communication Style]
    Q3 --> Q4[Interests]
    Q4 --> Q5[Sensory Triggers]
    Q5 --> Q6[Strengths]
    Q6 --> Q7[Therapy Goals]
    
    Q7 --> Analysis[AI Profile Analysis]
    Analysis --> Profile[Create UserProfile]
    
    Profile --> PhotoSetup[Photo Setup]
    
    style Welcome fill:#e1f5ff
    style Interview fill:#fff4e1
    style Analysis fill:#ffe1f5
    style Profile fill:#e1ffe1
```

---

## 3. BUDDY CREATION

🌟 **Revolutionary**: Transforming a child's own toy into a living digital friend.

```mermaid
graph TD
    Start[Start Buddy Creator] --> Method{Select Method}
    
    Method -->|Photo| Upload[Upload Toy<br/>Photo]
    Method -->|Description| Describe[Enter Text<br/>Description]
    
    Upload --> StyleSelect[Select Style]
    Describe --> StyleSelect
    
    StyleSelect --> Style2D[2D Cartoon<br/>Age 3-8]
    StyleSelect --> Style3D[3D Claymation<br/>Age 6-12]
    StyleSelect --> StylePixel[Pixel Art<br/>Age 10+]
    
    Style2D --> Gemini3Image[Generate Image<br/>Gemini 3 nano banana]
    Style3D --> Gemini3Image
    StylePixel --> Gemini3Image
    
    Gemini3Image --> Judge{"Judge Service<br/>Approval?"}
    
    Judge -->|Reject| Regenerate[Regenerate<br/>Revised Prompt]
    Regenerate --> Gemini3Image
    
    Judge -->|Approve| Personalize[Personalize]
    
    Personalize --> Name[Set Name]
    Name --> Personality[Select Personality<br/>Happy/Cool/Smart/Funny]
    Personality --> Voice[Select Voice<br/>Auto via Age]
    
    Voice --> Complete[Buddy Ready!<br/>Proceed to Activation]
    
    style Start fill:#e1f5ff
    style Gemini3Image fill:#ffe1f5
    style Judge fill:#fff4e1
    style Complete fill:#e1ffe1
```

---

## 4. ASSESSMENT SYSTEM

Static testing system to determine child's level.

```mermaid
graph TD
    Start[Start Assessment] --> AgeDetect{Age Group<br/>Detection}
    
    AgeDetect -->|Age 3-5| Early[Early Childhood<br/>Load JSON]
    AgeDetect -->|Age 6-12| School[School Age<br/>Load JSON]
    AgeDetect -->|Age 13+| Teen[Adolescent<br/>Load JSON]
    
    Early --> LoadImages[Load Images<br/>Gemini 3 nano banana]
    School --> LoadImages
    Teen --> LoadImages
    
    LoadImages --> JudgeImg{Judge Service<br/>Image Approval}
    
    JudgeImg -->|Reject| RegenerateImg[Regenerate]
    RegenerateImg --> LoadImages
    
    JudgeImg -->|Approve| Present[Present Question]
    
    Present --> Q1[Question 1/10]
    Q1 --> Q2[Question 2/10]
    Q2 --> Q3[...]
    Q3 --> Q10[Question 10/10]
    
    Q10 --> Score[Scoring]
    
    Score --> Level0[0-2 correct<br/>Level 0]
    Score --> Level1[3-5 correct<br/>Level 1]
    Score --> Level2[6-8 correct<br/>Level 2]
    Score --> Level3[9-10 correct<br/>Level 3]
    
    Level0 --> UpdateProfile[Update Profile]
    Level1 --> UpdateProfile
    Level2 --> UpdateProfile
    Level3 --> UpdateProfile
    
    UpdateProfile --> Complete[Proceed to Curriculum]
    
    style Start fill:#e1f5ff
    style LoadImages fill:#ffe1f5
    style Score fill:#fff4e1
    style Complete fill:#e1ffe1
```

---

## 5. CURRICULUM GENERATION

7-day personalized curriculum creation and parallel content generation.

```mermaid
graph TD
    Start[Generate Curriculum] --> Worker[Content Worker<br/>Start Store]
    
    Worker --> Task1[Task: GENERATE_CURRICULUM_STRUCTURE<br/>Priority: CRITICAL]
    
    Task1 --> AgeBranch{Age Branch<br/>Determine}
    
    AgeBranch -->|3-5| EarlyBranch[EarlyChildhood<br/>PECS, Matching]
    AgeBranch -->|6-12| SchoolBranch[SchoolAge<br/>Phonics, Reading]
    AgeBranch -->|13+| TeenBranch[Adolescent<br/>Life Skills]
    
    EarlyBranch --> GeminiCurr[Gemini 3<br/>Generate Curriculum]
    SchoolBranch --> GeminiCurr
    TeenBranch --> GeminiCurr
    
    GeminiCurr --> Curriculum[Curriculum Object<br/>7 Day Plan]
    
    Curriculum --> Parallel[Parallel Processing<br/>5 Modules Simultaneously]
    
    Parallel --> Module1[Module 1<br/>Content Gen]
    Parallel --> Module2[Module 2<br/>Content Gen]
    Parallel --> Module3[Module 3<br/>Content Gen]
    Parallel --> Module4[Module 4<br/>Content Gen]
    Parallel --> Module5[Module 5<br/>Content Gen]
    
    Module1 --> Generator1[Select Generator<br/>Choice/DragDrop/etc]
    Module2 --> Generator2[Select Generator]
    Module3 --> Generator3[Select Generator]
    Module4 --> Generator4[Select Generator]
    Module5 --> Generator5[Select Generator]
    
    Generator1 --> Images1[Gen Image<br/>Gemini 3 nano banana]
    Generator2 --> Images2[Gen Image<br/>Gemini 3 nano banana]
    Generator3 --> Images3[Gen Image<br/>Gemini 3 nano banana]
    Generator4 --> Images4[Gen Image<br/>Gemini 3 nano banana]
    Generator5 --> Images5[Gen Image<br/>Gemini 3 nano banana]
    
    Images1 --> Judge1{Judge Service<br/>Quality Control}
    Images2 --> Judge2{Judge Service}
    Images3 --> Judge3{Judge Service}
    Images4 --> Judge4{Judge Service}
    Images5 --> Judge5{Judge Service}
    
    Judge1 -->|Approve| Cache1[IndexedDB Cache]
    Judge2 -->|Approve| Cache2[IndexedDB Cache]
    Judge3 -->|Approve| Cache3[IndexedDB Cache]
    Judge4 -->|Approve| Cache4[IndexedDB Cache]
    Judge5 -->|Approve| Cache5[IndexedDB Cache]
    
    Judge1 -->|Reject| Generator1
    Judge2 -->|Reject| Generator2
    Judge3 -->|Reject| Generator3
    Judge4 -->|Reject| Generator4
    Judge5 -->|Reject| Generator5
    
    Cache1 --> Complete[Curriculum Ready!<br/>Go to Dashboard]
    Cache2 --> Complete
    Cache3 --> Complete
    Cache4 --> Complete
    Cache5 --> Complete
    
    style Start fill:#e1f5ff
    style GeminiCurr fill:#ffe1f5
    style Parallel fill:#fff4e1
    style Complete fill:#e1ffe1
```

---

## 6. GAME SYSTEM

Game session management and adaptive difficulty.

```mermaid
graph TD
    Start[Start Game] --> LoadPack[useGamePackLoader<br/>Load Module]
    
    LoadPack --> Cache{In Cache?}
    
    Cache -->|Yes| LoadFromCache[Load from Cache<br/>Fast]
    Cache -->|No| Generate[Generate Content<br/>Slow]
    
    Generate --> LoadFromCache
    
    LoadFromCache --> Session[useGameSession<br/>Start Session]
    
    Session --> Template{Select<br/>Game Template}
    
    Template --> DragDrop[DragDropTemplate]
    Template --> TapTrack[TapTrackTemplate]
    Template --> Choice[ChoiceTemplate]
    Template --> Speaking[SpeakingTemplate]
    Template --> TileReveal[TileRevealTemplate]
    Template --> Feeding[FeedingTemplate]
    Template --> Story[StoryBookPlayer]
    
    DragDrop --> BuddyWidget[Buddy Widget<br/>Live Support]
    TapTrack --> BuddyWidget
    Choice --> BuddyWidget
    Speaking --> BuddyWidget
    TileReveal --> BuddyWidget
    Feeding --> BuddyWidget
    Story --> BuddyWidget
    
    BuddyWidget --> Question[Present Question]
    
    Question --> Answer{Answer}
    
    Answer -->|Correct| Correct[✓ Correct!<br/>+1 Star]
    Answer -->|Wrong| Wrong[✗ Wrong<br/>Give Hint]
    
    Correct --> NextQ{"More<br/>Questions?"}
    Wrong --> Adaptive{Check Adaptive<br/>System}
    
    Adaptive -->|2+ Errors| Break[Offer Break]
    Adaptive -->|Continue| NextQ
    
    Break --> NextQ
    
    NextQ -->|Yes| Question
    NextQ -->|No 5/5| Complete[Session Complete<br/>Celeberation!]
    
    Complete --> SaveLog[Save Performance Log]
    SaveLog --> UpdateModule[Mark Module Complete]
    UpdateModule --> Dashboard[Return to Dashboard]
    
    style Start fill:#e1f5ff
    style BuddyWidget fill:#ffe1f5
    style Adaptive fill:#fff4e1
    style Complete fill:#e1ffe1
```

---

## 7. MAGIC HOMEWORK CONVERTER

🌟 **Revolutionary**: Automatically converting paper homework into interactive games.

```mermaid
graph TD
    Start[Start Homework Converter] --> Upload[Upload Homework<br/>Photo]
    
    Upload --> Vision[Gemini 3 Vision API<br/>Analyze]
    
    Vision --> Extract[Extract Info]
    
    Extract --> Topic[Topic: Animals]
    Extract --> Subject[Subject: Science]
    Extract --> Age[Age Group: 6-8]
    Extract --> Difficulty[Difficulty: L1/L2/L3]
    Extract --> GameType[Game Type: MATCHING]
    Extract --> Items[Game Items]
    
    Topic --> Preview[Parent Preview]
    Subject --> Preview
    Age --> Preview
    Difficulty --> Preview
    GameType --> Preview
    Items --> Preview
    
    Preview --> Decision{Parent<br/>Decision}
    
    Decision -->|Test| TestGame[Create Test Game<br/>Temp Module]
    Decision -->|Cancel| Cancel[Cancel<br/>Go Back]
    
    TestGame --> Worker[Content Worker<br/>Generate Content]
    
    Worker --> Generator[Select Generator<br/>With Prompt]
    Generator --> GenContent[Generate 5Q Pack]
    GenContent --> GenImages[Gen Images<br/>Gemini 3 nano banana]
    GenImages --> JudgeTest{Judge Service<br/>Approve?}
    
    JudgeTest -->|Reject| Generator
    JudgeTest -->|Approve| CacheTemp[Temp Cache]
    
    CacheTemp --> PlayTest[Parent Plays Test<br/>Game Arena]
    
    PlayTest --> Approve{"Approve?"}
    
    Approve -->|Yes| AddToCurr[Add to Curriculum<br/>Permanent Module]
    Approve -->|No| Cancel
    
    AddToCurr --> CopyContent[Copy Content<br/>With Permanent ID]
    CopyContent --> UpdateCurr[Update Curriculum]
    UpdateCurr --> Complete[Complete!<br/>Visible on Dashboard]
    
    Complete --> Dashboard[Return to Dashboard]
    Cancel --> Dashboard
    
    style Start fill:#e1f5ff
    style Vision fill:#ffe1f5
    style PlayTest fill:#fff4e1
    style Complete fill:#e1ffe1
```

---

## 8. AR-LITE HOME GALLERY

🌟 **Revolutionary**: Converting child's own home into game space and real world generalization.

```mermaid
graph TD
    Start[Start Home Gallery] --> Category{Select<br/>Category}
    
    Category --> Kitchen[🍳 KITCHEN]
    Category --> Bedroom[🛏️ BEDROOM]
    Category --> Family[👨‍👩‍👧 FAMILY]
    Category --> Other[📦 OTHER]
    
    Kitchen --> Upload[Upload Photo<br/>Wide Angle]
    Bedroom --> Upload
    Family --> Upload
    Other --> Upload
    
    Upload --> Vision[Gemini 3 Vision API<br/>Object Detection]
    
    Vision --> Detect[Detect Objects]
    
    Detect --> Objects[DetectedObjects Array]
    Objects --> Obj1[Apple<br/>Box: 100,200,150,250]
    Objects --> Obj2[Refrigerator<br/>Box: 50,100,400,300]
    Objects --> Obj3[Chair<br/>Box: 300,150,380,280]
    
    Obj1 --> SaveGallery[Save to Gallery<br/>UserPhoto]
    Obj2 --> SaveGallery
    Obj3 --> SaveGallery
    
    SaveGallery --> Options{Parent<br/>Option}
    
    Options -->|Test Play| CreateGame[Create Game<br/>TAP_TRACK]
    Options -->|Assign to Schedule| AddToSchedule[Add to Curriculum]
    
    CreateGame --> SelectTarget[Select Random Target<br/>e.g. Apple]
    SelectTarget --> BuildPayload[Build Game Payload]
    
    BuildPayload --> Background[Background: Real Photo]
    BuildPayload --> Instruction[Instruction: Find the Apple!]
    BuildPayload --> Items[Items: All Objects]
    BuildPayload --> Positions[Positions: Bounding Boxes]
    
    Background --> PlayGame[Play Game<br/>Game Arena]
    Instruction --> PlayGame
    Items --> PlayGame
    Positions --> PlayGame
    
    PlayGame --> Child[Child Experience]
    
    Child --> Recognize[Recognizes<br/>Own Kitchen]
    Recognize --> Search[Search for Apple]
    Search --> Click{Click}
    
    Click -->|Correct| Success[✓ Success!<br/>Buddy Celebrates]
    Click -->|Wrong| Hint[Give Hint<br/>Try Again]
    
    Hint --> Search
    
    Success --> Transfer[Generalization<br/>To Real World]
    Transfer --> RealWorld[Can Find Apple<br/>In Real Kitchen!]
    
    AddToSchedule --> Permanent[Permanent Module<br/>Visible on Dashboard]
    
    RealWorld --> Complete[Complete!]
    Permanent --> Complete
    
    Complete --> Dashboard[Return to Dashboard]
    
    style Start fill:#e1f5ff
    style Vision fill:#ffe1f5
    style Child fill:#fff4e1
    style Transfer fill:#e1ffe1
    style RealWorld fill:#d4edda
```

---

## 9. AI SERVICES

### 9.1 Judge Service Workflow

Quality assurance and safety check for all generated content.

```mermaid
graph TD
    Start[Content Generated] --> JudgeCall[Call<br/>Judge Service]
    
    JudgeCall --> Type{Content<br/>Type}
    
    Type -->|Text/JSON| ValidateContent[validateContent]
    Type -->|Image| ValidateImage[validateImage]
    
    ValidateContent --> GeminiJudge1[Gemini 3<br/>JUDGE_MODEL]
    ValidateImage --> GeminiJudge2[Gemini 3<br/>JUDGE_MODEL]
    
    GeminiJudge1 --> Criteria1[Check Criteria]
    GeminiJudge2 --> Criteria2[Check Criteria]
    
    Criteria1 --> Safety1[1. SAFETY<br/>No Violence/Fear]
    Criteria1 --> Relevance1[2. RELEVANCE<br/>Fulfills Task]
    Criteria1 --> Educational1[3. EDUCATIONAL<br/>Age Appropriate]
    Criteria1 --> Dignity1[4. DIGNITY<br/>Respect Special Needs]
    
    Criteria2 --> Safety2[1. SAFETY<br/>No Disturbing Content]
    Criteria2 --> Relevance2[2. RELEVANCE<br/>Expected Content]
    Criteria2 --> Quality2[3. QUALITY<br/>Clear Visibility]
    Criteria2 --> Style2[4. STYLE MATCH<br/>Age Appropriate]
    
    Safety1 --> Result1[JudgeResult]
    Relevance1 --> Result1
    Educational1 --> Result1
    Dignity1 --> Result1
    
    Safety2 --> Result2[JudgeResult]
    Relevance2 --> Result2
    Quality2 --> Result2
    Style2 --> Result2
    
    Result1 --> Decision{Decision}
    Result2 --> Decision
    
    Decision -->|"isSafe=true<br/>isRelevant=true<br/>isEducationallySound=true"| Approve[✓ APPROVE<br/>Content Ready]
    
    Decision -->|Any<br/>false| Reject[✗ REJECT<br/>Correction Instruction]
    
    Reject --> Severity{Severity<br/>Level}
    
    Severity -->|LOW| Retry1[Retry<br/>Attempt 1]
    Severity -->|MEDIUM| Retry2[Retry<br/>Attempt 2]
    Severity -->|CRITICAL| Fallback[Fallback Content<br/>Safe Default]
    
    Retry1 --> Correction[Add Correction<br/>Prompt]
    Retry2 --> Correction
    
    Correction --> Regenerate[Regenerate<br/>Content]
    Regenerate --> JudgeCall
    
    Approve --> Complete[Complete]
    Fallback --> Complete
    
    style Start fill:#e1f5ff
    style GeminiJudge1 fill:#ffe1f5
    style GeminiJudge2 fill:#ffe1f5
    style Approve fill:#e1ffe1
    style Reject fill:#ffe1e1
    style Fallback fill:#fff4e1
```

### 9.2 Content Generation Pipeline

Content generation process for different game types.

```mermaid
graph LR
    Start[Content Request] --> BaseGen[BaseGenerator]
    
    BaseGen --> SelectGen{Select<br/>Generator}
    
    SelectGen --> Choice[ChoiceGenerator<br/>Multiple Choice]
    SelectGen --> DragDrop[DragDropGenerator<br/>Drag & Drop]
    SelectGen --> Speaking[SpeakingGenerator<br/>Speech Practice]
    SelectGen --> TapTrack[TapTrackGenerator<br/>Tap Game]
    SelectGen --> TileReveal[TileRevealGenerator<br/>Tile Reveal]
    SelectGen --> Shop[ShopScenarioGenerator<br/>Shopping]
    SelectGen --> Story[StoryBookGenerator<br/>Story]
    
    Choice --> GeminiPro1[Gemini 3<br/>Gen JSON]
    DragDrop --> GeminiPro2[Gemini 3<br/>Gen JSON]
    Speaking --> GeminiPro3[Gemini 3<br/>Gen JSON]
    TapTrack --> GeminiPro4[Gemini 3<br/>Gen JSON]
    TileReveal --> GeminiPro5[Gemini 3<br/>Gen JSON]
    Shop --> GeminiPro6[Gemini 3<br/>Gen JSON]
    Story --> GeminiPro7[Gemini 3<br/>Gen JSON]
    
    GeminiPro1 --> Schema1[Validate<br/>JSON Schema]
    GeminiPro2 --> Schema2[Validate<br/>JSON Schema]
    GeminiPro3 --> Schema3[Validate<br/>JSON Schema]
    GeminiPro4 --> Schema4[Validate<br/>JSON Schema]
    GeminiPro5 --> Schema5[Validate<br/>JSON Schema]
    GeminiPro6 --> Schema6[Validate<br/>JSON Schema]
    GeminiPro7 --> Schema7[Validate<br/>JSON Schema]
    
    Schema1 --> Images[Gen Images<br/>Gemini 3 nano banana]
    Schema2 --> Images
    Schema3 --> Images
    Schema4 --> Images
    Schema5 --> Images
    Schema6 --> Images
    Schema7 --> Images
    
    Images --> Judge[Judge Service<br/>Quality Control]
    
    Judge --> Output[GamePayload<br/>Ready]
    
    style Start fill:#e1f5ff
    style GeminiPro1 fill:#ffe1f5
    style GeminiPro2 fill:#ffe1f5
    style GeminiPro3 fill:#ffe1f5
    style Images fill:#fff4e1
    style Output fill:#e1ffe1
```

### 9.3 Gemini 3 Live Service

Real-time voice interaction and context management.

```mermaid
graph TD
    Start[Start Live Service] --> Mode{Select<br/>Mode}
    
    Mode -->|Conversation| VoiceMode[Voice Mode<br/>textOnly=false]
    Mode -->|TTS| TTSMode[TTS Mode<br/>textOnly=true]
    
    VoiceMode --> Mic[Microphone<br/>Active]
    TTSMode --> NoMic[Microphone<br/>Off]
    
    Mic --> AudioContext[Create<br/>AudioContext]
    NoMic --> AudioContext
    
    AudioContext --> Worklet[AudioWorklet<br/>Processor]
    Worklet --> Stream[MediaStream<br/>Mic Flow]
    
    Stream --> GeminiLive[Gemini 3 Live API<br/>WebSocket]
    
    GeminiLive --> Context[Update<br/>Session Context]
    
    Context --> CurrentModule[currentModule]
    Context --> CurrentActivity[currentActivity]
    Context --> Score[score]
    Context --> Emotion[emotion]
    Context --> ConsecutiveErrors[consecutiveErrors]
    Context --> CriticalMoment[isInCriticalMoment]
    
    CurrentModule --> Priority{Determine<br/>Priority}
    CurrentActivity --> Priority
    Score --> Priority
    Emotion --> Priority
    ConsecutiveErrors --> Priority
    CriticalMoment --> Priority
    
    Priority -->|HIGH| Immediate[Speak Immediately<br/>0 sec]
    Priority -->|MEDIUM| Wait1[Wait<br/>1.5 sec]
    Priority -->|LOW| Wait5[Wait<br/>5 sec]
    
    Immediate --> Speak[Buddy Speaks]
    Wait1 --> Speak
    Wait5 --> Speak
    
    Speak --> Analyser[AnalyserNode<br/>Volume Level]
    Analyser --> Animation[Avatar Animation<br/>Audio Based]
    
    Animation --> Output[Audio Output<br/>Speaker]
    
    Output --> Listen[Listen Mode<br/>User Response]
    Listen --> GeminiLive
    
    style Start fill:#e1f5ff
    style GeminiLive fill:#ffe1f5
    style Context fill:#fff4e1
    style Animation fill:#e1ffe1
```

---

## 10. DATA FLOW

### 10.1 State Management Architecture

Zustand store structure and data management.

```mermaid
graph TD
    App[React App] --> UserStore[User Store<br/>Zustand]
    App --> WorkerStore[Content Worker Store<br/>Zustand]
    
    UserStore --> Persistent[Persistent Data<br/>IndexedDB]
    UserStore --> Memory[Temporary Data<br/>Memory]
    
    Persistent --> Profile[profile<br/>UserProfile]
    Persistent --> Buddy[buddy<br/>BuddyInfo]
    Persistent --> Curriculum[curriculum<br/>Curriculum]
    Persistent --> Completed[completedModuleIds<br/>string array]
    Persistent --> Tokens[tokens<br/>number]
    Persistent --> Logs[performanceLogs<br/>PerformanceLog array]
    Persistent --> Gallery[gallery<br/>UserPhoto array]
    Persistent --> Stories[stories<br/>Story array]
    Persistent --> Inventory[inventory<br/>InventoryItem array]
    
    Memory --> ModuleContents[moduleContents<br/>Map string GamePayload]
    Memory --> BuddyState[buddyState<br/>BuddyState]
    Memory --> ShortHistory[shortTermHistory<br/>Message array]
    Memory --> ActiveModule[activeModule<br/>string]
    
    WorkerStore --> TaskQueue[Task Queue<br/>Priority Based]
    
    TaskQueue --> Task1[GENERATE_CURRICULUM_STRUCTURE<br/>Priority: CRITICAL]
    TaskQueue --> Task2[GENERATE_MODULE_CONTENT<br/>Priority: HIGH]
    TaskQueue --> Task3[GENERATE_BUDDY_IMAGE<br/>Priority: MEDIUM]
    
    Task1 --> Executor1[Task Executor]
    Task2 --> Executor2[Task Executor]
    Task3 --> Executor3[Task Executor]
    
    Executor1 --> Status1{Status}
    Executor2 --> Status2{Status}
    Executor3 --> Status3{Status}
    
    Status1 -->|SUCCESS| Remove1[Remove from Queue]
    Status1 -->|ERROR| Retry1[Retry<br/>Max 3]
    
    Status2 -->|SUCCESS| Remove2[Remove from Queue]
    Status2 -->|ERROR| Retry2[Retry<br/>Max 3]
    
    Status3 -->|SUCCESS| Remove3[Remove from Queue]
    Status3 -->|ERROR| Retry3[Retry<br/>Max 3]
    
    Remove1 --> NextTask[Next Task]
    Remove2 --> NextTask
    Remove3 --> NextTask
    
    Retry1 --> TaskQueue
    Retry2 --> TaskQueue
    Retry3 --> TaskQueue
    
    style App fill:#e1f5ff
    style UserStore fill:#ffe1f5
    style WorkerStore fill:#fff4e1
    style Persistent fill:#e1ffe1
```

### 10.2 IndexedDB Cache Strategy

Caching strategy and TTL management.

```mermaid
graph LR
    Request[Content Request] --> CheckCache{In Cache?}
    
    CheckCache -->|Yes| CheckTTL{TTL<br/>Valid?}
    CheckCache -->|No| Generate[Generate Content]
    
    CheckTTL -->|Yes| LoadCache[Load from Cache<br/>Fast ~50ms]
    CheckTTL -->|No| Generate
    
    Generate --> API[AI API Call<br/>Slow ~45s]
    API --> SaveCache[Save to Cache]
    
    SaveCache --> CacheTable1[cache Table<br/>GamePayload]
    SaveCache --> CacheTable2[images Table<br/>Base64 String]
    
    CacheTable1 --> TTL1[TTL: 7 days]
    CacheTable2 --> TTL2[TTL: 30 days]
    
    LoadCache --> Return[Return Content]
    TTL1 --> Return
    TTL2 --> Return
    
    Return --> Cleanup{Cleanup<br/>Needed?}
    
    Cleanup -->|Yes| RemoveOld[Remove<br/>Old Records]
    Cleanup -->|No| Done[Done]
    
    RemoveOld --> Done
    
    style Request fill:#e1f5ff
    style CheckCache fill:#ffe1f5
    style LoadCache fill:#e1ffe1
    style Generate fill:#fff4e1
```

### 10.3 Performance Optimization

Parallel processing and optimization strategies.

```mermaid
graph TD
    Start[Performance<br/>Optimization] --> Strategy1[Parallel Processing]
    Start --> Strategy2[Caching]
    Start --> Strategy3[Memory Management]
    
    Strategy1 --> Parallel1[5 Modules Concurrent]
    Strategy1 --> Parallel2[Batch Image Requests]
    Strategy1 --> Parallel3[AudioWorklet Thread]
    
    Strategy2 --> Cache1[IndexedDB<br/>Persistent Cache]
    Strategy2 --> Cache2[Memory Cache<br/>Active Module]
    Strategy2 --> Cache3[Service Worker<br/>Future]
    
    Strategy3 --> Memory1["Context Compression<br/>>8000 chars"]
    Strategy3 --> Memory2[Image Optimization<br/>Base64 Compression]
    Strategy3 --> Memory3[State Cleanup<br/>Old Logs]
    
    Parallel1 --> Result1[Curriculum Time<br/>3 min → 45 sec]
    Parallel2 --> Result1
    Parallel3 --> Result1
    
    Cache1 --> Result2[Load Time<br/>Instant]
    Cache2 --> Result2
    
    Memory1 --> Result3[Stability<br/>No Crashes]
    Memory2 --> Result3
    
    style Start fill:#e1f5ff
    style Strategy1 fill:#ffe1f5
    style Result1 fill:#e1ffe1
```
