import { AssistantContext, AssistantResponse, SafeComplaintCard, ActionButton } from './types';
import {
  DEPARTMENTS_KNOWLEDGE,
  STATUS_EXPLANATIONS,
  EMERGENCY_HELPLINES,
  SUGGESTED_QUESTIONS,
} from './knowledge';
import { CATEGORY_OPTIONS, getCategoryLabel, formatComplaintDate } from '@/lib/complaints';

/**
 * Deterministic rule-based civic assistant engine for FixMyBharat.
 * Evaluates citizen user inputs against verified platform workflows and returns
 * structured, transparent responses without requiring external AI/LLM API keys.
 */
export async function processCivicMessage(
  rawInput: string,
  context: AssistantContext
): Promise<AssistantResponse> {
  const query = rawInput.trim().toLowerCase();

  if (!query) {
    return {
      reply: 'Please ask a question about reporting civic issues, checking complaint status, or municipal departments.',
      suggestedActions: SUGGESTED_QUESTIONS.slice(0, 3).map((q) => ({ label: q, query: q })),
    };
  }

  // 1. SAFETY & EMERGENCY GUARDRAIL
  const emergencyKeywords = [
    'emergency',
    'fire',
    'police',
    'ambulance',
    'accident',
    'blood',
    'crime',
    'theft',
    'robbery',
    'injured',
    'injury',
    'hospital',
    'life danger',
    'danger to life',
    'electrocuted',
    'electrocution',
    'dying',
    'collapsed building',
    'gas leak',
  ];

  if (emergencyKeywords.some((kw) => query.includes(kw))) {
    let reply = `⚠️ **URGENT SAFETY NOTICE**\n\nFixMyBharat is an asynchronous civic issue tracker and is **NOT an emergency response dispatch service**.\n\nIf you or someone else is in immediate danger, or if there is a medical, fire, or criminal emergency, please dial the official Indian emergency helplines immediately:\n\n`;

    EMERGENCY_HELPLINES.forEach((h) => {
      reply += `- **${h.name}**: **${h.number}** (${h.desc})\n`;
    });

    reply += `\n*Do not wait for a civic complaint ticket if lives or immediate safety are at risk.*`;

    return {
      reply,
      suggestedActions: [
        { label: 'How do I report a non-emergency issue?', query: 'How do I report a pothole?' },
        { label: 'View Departments', query: 'Which department handles streetlights or water leakage?' },
      ],
    };
  }

  // 2. WHAT HAPPENS AFTER SUBMISSION (LIFECYCLE)
  const isAskingLifecycle =
    query.includes('what happens after') ||
    query.includes('after submit') ||
    query.includes('after submitting') ||
    query.includes('lifecycle') ||
    query.includes('stages of') ||
    query.includes('stages') ||
    query.includes('next step') ||
    query.includes('resolution workflow');

  if (isAskingLifecycle) {
    let reply = `### FixMyBharat Resolution Lifecycle\n\nWhen you submit a civic issue, it progresses through transparent verification stages:\n\n`;

    const stages = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved'];
    stages.forEach((st) => {
      const info = STATUS_EXPLANATIONS[st];
      reply += `**Stage ${info.stage}: ${info.label}**\n${info.description} *Next step: ${info.nextStep}*\n\n`;
    });

    reply += `**Special Branches:**\n`;
    reply += `- **Needs Information**: The municipal team requires additional location details or photos from you before proceeding.\n`;
    reply += `- **Rejected**: Flagged if the report is outside municipal jurisdiction, fraudulent, or a confirmed duplicate.\n\n`;
    reply += `You can follow every public update on your report via the **[Notifications](/citizen/notifications)** tab.`;

    return {
      reply,
      suggestedActions: [
        { label: 'View My Reports', href: '/citizen/reports' },
        { label: 'Check Notifications', href: '/citizen/notifications' },
        { label: 'How can I check status?', query: 'How can I check my complaint status?' },
      ],
    };
  }

  // 3. HOW TO CHECK STATUS (GUIDANCE)
  const isAskingStatusCheck =
    query.includes('how can i check') ||
    query.includes('how do i check') ||
    query.includes('how to check') ||
    query.includes('check status') ||
    query.includes('check my complaint status') ||
    query.includes('track my complaint') ||
    query.includes('track complaint') ||
    query.includes('where to check');

  if (isAskingStatusCheck) {
    const reply = `### How to Check Your Complaint Status

There are two primary ways to track your reports:

1. **My Reports Dashboard (\`/citizen/reports\`)**:
   - Access **[My Reports](/citizen/reports)** to view all complaints submitted by your account.
   - Filter by status (*All, Submitted, In Progress, Resolved*).
   - Click on any report card to view its 5-stage progress bar, evidence photo, and verified resolution notes.

2. **Notifications Tab (\`/citizen/notifications\`)**:
   - The **[Notifications](/citizen/notifications)** tab lists real-time public updates published by municipal officials.
   - Displays status transitions (e.g., *Submitted → Under Review*), timestamps, and operational comments.

*Tip: You can also ask me "Show my recent complaints" right here in this chat!*`;

    return {
      reply,
      suggestedActions: [
        { label: 'Open My Reports', href: '/citizen/reports', variant: 'primary' },
        { label: 'Check Notifications', href: '/citizen/notifications' },
        { label: 'Show my recent complaints', query: 'Show my recent complaints' },
      ],
    };
  }

  // 4. HOW TO REPORT A POTHOLE / CIVIC ISSUE
  const isAskingHowToReport =
    query.includes('how do i report') ||
    query.includes('how to report') ||
    query.includes('report a pothole') ||
    query.includes('report pothole') ||
    query.includes('file a complaint') ||
    query.includes('submit a complaint') ||
    query.includes('submit complaint') ||
    query.includes('file complaint') ||
    query.includes('report an issue') ||
    query.includes('register complaint');

  if (isAskingHowToReport) {
    const isPotholeSpecific = query.includes('pothole');
    const categoryFocus = isPotholeSpecific ? 'Pothole' : 'appropriate category';

    const reply = `### How to Report a Civic Issue in FixMyBharat

Follow these simple steps to submit a report:

1. **Navigate to the Report Form**:
   Click on **[Report an Issue](/citizen/report)** in the navigation menu.

2. **Select the Category**:
   Choose **${categoryFocus}** from the 8 supported categories (*Potholes, Garbage, Water Leakage, Drainage, Streetlights, Footpaths, Open Manholes, Other*).

3. **Specify the Exact Location**:
   - Provide a landmark or street address (e.g., *"Near Main Gate, Gandhi Nagar, Ward 14"*).
   - If on mobile, your device's GPS coordinates will be automatically recorded to pinpoint the location.

4. **Upload Photographic Proof**:
   Upload a clear photograph showing the defect and surrounding road/footpath context. Photos help triage officers assess severity quickly.

5. **Submit**:
   Click **Submit Complaint**. Your report receives a unique tracking number (e.g., \`Report #104\`) and enters the **Submitted** queue for operational verification.`;

    const actions: ActionButton[] = [
      { label: 'Go to Report Form', href: '/citizen/report', variant: 'primary' },
      { label: 'What happens after I submit?', query: 'What happens after I submit a complaint?' },
      { label: 'What info should I include?', query: 'What information should I include in a report?' },
    ];

    return { reply, suggestedActions: actions };
  }

  // 5. COMPLAINT-SPECIFIC LOOKUP FOR SIGNED-IN CITIZEN
  const isAskingMyComplaints =
    query.includes('show my report') ||
    query.includes('show my complaint') ||
    query.includes('list my complaint') ||
    query.includes('list my report') ||
    query.includes('my recent complaints') ||
    query.includes('my complaints') ||
    query.includes('my reports') ||
    query.includes('status of report') ||
    query.includes('status of complaint') ||
    query.includes('report #') ||
    query.includes('complaint #') ||
    query.startsWith('check report') ||
    query.startsWith('check complaint');

  if (isAskingMyComplaints) {
    return handleComplaintLookup(rawInput, query, context);
  }

  // 6. WHAT INFORMATION TO INCLUDE IN A REPORT
  const isAskingWhatToInclude =
    query.includes('what information') ||
    query.includes('what to include') ||
    query.includes('what details') ||
    query.includes('tips for reporting') ||
    query.includes('photo required') ||
    query.includes('good report');

  if (isAskingWhatToInclude) {
    const reply = `### What Information to Include for Faster Resolution

Reports with clear, objective details are resolved significantly faster by field engineers:

1. **Clear, Specific Title**:
   - *Good*: "Deep pothole outside St. Mary School main gate"
   - *Avoid*: "Road bad"

2. **Accurate Category**:
   - Choosing the right category (*e.g., Drainage vs. Water Leakage*) routes the report directly to the correct specialized department.

3. **Precise Location & Landmarks**:
   - Mention landmarks, shop numbers, cross streets, or lane numbers.
   - Example: *"Opposite Metro Pillar 245, Service Road, toward Ring Road"*.

4. **Clear Photographic Proof**:
   - Take a well-lit photo showing both the issue (e.g. the pothole) and surrounding landmarks to help field workforce find the spot quickly.

5. **Severity Details in Description**:
   - Note if there is exposed rebar, dangerous depth, stagnant sewage, or risk to two-wheelers and pedestrians.`;

    return {
      reply,
      suggestedActions: [
        { label: 'Report an Issue Now', href: '/citizen/report', variant: 'primary' },
        { label: 'Which department handles what?', query: 'Which department handles streetlights or water leakage?' },
      ],
    };
  }

  // 7. WHICH DEPARTMENT HANDLES WHAT
  const isAskingDepartment =
    query.includes('department') ||
    query.includes('who handles') ||
    query.includes('streetlights') ||
    query.includes('streetlight') ||
    query.includes('water leakage') ||
    query.includes('water supply') ||
    query.includes('garbage') ||
    query.includes('sanitation') ||
    query.includes('drainage') ||
    query.includes('manhole');

  if (isAskingDepartment) {
    let reply = `### Municipal Department Responsibilities in FixMyBharat\n\nComplaints are automatically routed to specialized municipal departments:\n\n`;

    DEPARTMENTS_KNOWLEDGE.forEach((dept) => {
      reply += `**${dept.name}**\n`;
      reply += `${dept.description}\n`;
      reply += `*Handles: ${dept.handles.join(', ')}*\n\n`;
    });

    reply += `*When you select a category during report submission, FixMyBharat assigns the appropriate department automatically during triage.*`;

    return {
      reply,
      suggestedActions: [
        { label: 'Report an Issue', href: '/citizen/report' },
        { label: 'How do I report a pothole?', query: 'How do I report a pothole?' },
      ],
    };
  }

  // 8. CATEGORIES LIST
  const isAskingCategories =
    query.includes('categories') ||
    query.includes('what issues can i report') ||
    query.includes('types of issues') ||
    query.includes('types of complaints');

  if (isAskingCategories) {
    let reply = `### Supported Civic Issue Categories\n\nFixMyBharat currently handles 8 civic issue categories:\n\n`;

    CATEGORY_OPTIONS.forEach((cat) => {
      reply += `- **${cat.label}**\n`;
    });

    reply += `\nFor issues that do not fall cleanly into these categories, you can select **Other**, and our triage officers will review and route it to Public Works.`;

    return {
      reply,
      suggestedActions: [
        { label: 'Report an Issue', href: '/citizen/report', variant: 'primary' },
        { label: 'Which department handles what?', query: 'Which department handles streetlights or water leakage?' },
      ],
    };
  }

  // 9. ABOUT FIXMYBHARAT / WHO ARE YOU
  const isAskingAbout =
    query.includes('who are you') ||
    query.includes('what is fixmybharat') ||
    query.includes('what are you') ||
    query.includes('are you ai') ||
    query.includes('how do you work') ||
    query.includes('about you');

  if (isAskingAbout) {
    const reply = `### About FixMyBharat Civic Assistant

I am the **FixMyBharat Civic Assistant**, a deterministic, rule-based guidance system.

**Key Information:**
- **Architecture**: Rule-based civic intelligence engine (not an external LLM).
- **Purpose**: Assist citizens with complaint reporting procedures, status explanations, category routing, and complaint lookups.
- **Privacy & Security**: All data access is strictly governed by Supabase Row Level Security (RLS). I can only access your own submitted reports and will never expose internal staff notes, other citizens' reports, or administrative credentials.
- **Limitations**: I cannot change complaint statuses, promise municipal resolution deadlines, or dispatch emergency personnel. For emergencies, always call **112**.`;

    return {
      reply,
      suggestedActions: [
        { label: 'How do I report a pothole?', query: 'How do I report a pothole?' },
        { label: 'Show my recent complaints', query: 'Show my recent complaints' },
      ],
    };
  }

  // 10. GREETINGS
  const isGreeting =
    query === 'hi' ||
    query === 'hello' ||
    query === 'hey' ||
    query === 'namaste' ||
    query.startsWith('hi ') ||
    query.startsWith('hello ');

  if (isGreeting) {
    const nameGreeting = context.userName ? `, ${context.userName}` : '';
    const reply = `Namaste${nameGreeting}! I am the **FixMyBharat Civic Assistant**.\n\nI can help you navigate civic reporting, track your submitted complaints, understand municipal department workflows, and know what to do when civic issues arise.\n\nHow can I help you today?`;

    return {
      reply,
      suggestedActions: SUGGESTED_QUESTIONS.slice(0, 4).map((q) => ({ label: q, query: q })),
    };
  }

  // 11. OUT-OF-SCOPE FALLBACK
  return {
    reply: `I am a specialized, rule-based civic assistant designed specifically for **FixMyBharat complaint reporting, status tracking, and municipal issue routing**.\n\nI do not have authoritative information regarding "${rawInput.length > 60 ? rawInput.slice(0, 60) + '...' : rawInput}".\n\n- To file a civic complaint regarding roads, sanitation, water, streetlights, or drainage, please use the **[Report an Issue](/citizen/report)** form.\n- To check your existing reports, visit **[My Reports](/citizen/reports)**.\n- For official government services, taxes, certificates, or administrative queries, please contact your local municipal corporation office or visit your state civic portal.\n- In any emergency, dial **112**.`,
    suggestedActions: [
      { label: 'How do I report a pothole?', query: 'How do I report a pothole?' },
      { label: 'How can I check my complaint status?', query: 'How can I check my complaint status?' },
      { label: 'Which department handles streetlights?', query: 'Which department handles streetlights or water leakage?' },
    ],
  };
}

/**
 * Handles complaint lookups for the authenticated citizen with strict RLS enforcement.
 * Queries Supabase only for complaints where user_id = auth.uid() and returns only safe public fields.
 */
async function handleComplaintLookup(
  rawInput: string,
  query: string,
  context: AssistantContext
): Promise<AssistantResponse> {
  if (!context.supabase || !context.userId) {
    return {
      reply: `To inspect your submitted complaints, please make sure you are signed in to your citizen account. You can view all your reports on the **[My Reports](/citizen/reports)** dashboard.`,
      suggestedActions: [{ label: 'Go to My Reports', href: '/citizen/reports', variant: 'primary' }],
    };
  }

  // Check if user specifically requested a report number (e.g., "#2", "report 2", "complaint 2")
  const numberMatch = rawInput.match(/#?(\d+)/);
  const targetNumber = numberMatch ? numberMatch[1] : null;

  try {
    const supabase = context.supabase;

    // Secure query: Row Level Security on public.complaints enforces (user_id = auth.uid())
    const { data, error } = await supabase
      .from('complaints')
      .select('id, complaint_number, title, category, status, created_at')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return {
        reply: `I encountered a momentary issue while looking up your reports: ${error.message}. You can view your reports directly on the **[My Reports](/citizen/reports)** page.`,
        suggestedActions: [{ label: 'Open My Reports', href: '/citizen/reports' }],
      };
    }

    const items = (data as SafeComplaintCard[]) || [];

    if (items.length === 0) {
      return {
        reply: `You haven't submitted any civic complaints yet from this account.\n\nIf you have noticed a pothole, open manhole, water leakage, or overflowing garbage in your neighborhood, you can submit a report now!`,
        suggestedActions: [
          { label: 'Report an Issue Now', href: '/citizen/report', variant: 'primary' },
          { label: 'How do I report a pothole?', query: 'How do I report a pothole?' },
        ],
      };
    }

    // If citizen searched for a specific report number
    if (targetNumber) {
      const matched = items.find((c) => String(c.complaint_number) === targetNumber);

      if (matched) {
        const statusInfo = STATUS_EXPLANATIONS[matched.status.toLowerCase()] || {
          label: matched.status,
          description: 'Under active operational management.',
          nextStep: 'Check report timeline for updates.',
        };

        const reply = `### Report #${matched.complaint_number}: ${matched.title}\n\n- **Category**: ${getCategoryLabel(matched.category)}\n- **Current Status**: **${statusInfo.label}**\n- **Submitted On**: ${formatComplaintDate(matched.created_at)}\n\n**Status Detail**:\n${statusInfo.description}\n\n*Next Step*: ${statusInfo.nextStep}\n\nYou can click below to inspect full photos, coordinates, and official activity notes.`;

        return {
          reply,
          complaintCards: [matched],
          suggestedActions: [
            { label: `View Report #${matched.complaint_number}`, href: `/citizen/reports/${matched.id}`, variant: 'primary' },
            { label: 'View All My Reports', href: '/citizen/reports' },
            { label: 'Check Notifications', href: '/citizen/notifications' },
          ],
        };
      } else {
        return {
          reply: `I searched your account, but couldn't find a report with number **#${targetNumber}** belonging to you.\n\nHere are your actual submitted complaints below:`,
          complaintCards: items.slice(0, 3),
          suggestedActions: [
            { label: 'Open My Reports Dashboard', href: '/citizen/reports', variant: 'primary' },
          ],
        };
      }
    }

    // General "Show my complaints"
    const reply = `### Your Recent Civic Reports (${items.length} total)\n\nHere are the most recent complaints filed by your account. Click any card below to view full operational details:`;

    return {
      reply,
      complaintCards: items.slice(0, 5),
      suggestedActions: [
        { label: 'View All Reports', href: '/citizen/reports', variant: 'primary' },
        { label: 'Check Notifications', href: '/citizen/notifications' },
        { label: 'Report a New Issue', href: '/citizen/report' },
      ],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database query failed';
    return {
      reply: `Failed to retrieve reports: ${msg}. You can always view them directly at **[My Reports](/citizen/reports)**.`,
      suggestedActions: [{ label: 'Go to My Reports', href: '/citizen/reports' }],
    };
  }
}
