/**
 * The Contour gallery: every collector primitive in every state, in Day and Dusk.
 *
 * Development builds only — the (dev) layout sends a release build back to the start. There is no
 * button for it in the app. Open it with the deep link:
 *
 *   npx uri-scheme open fieldmaps://gallery --ios      (or --android)
 *   xcrun simctl openurl booted fieldmaps://gallery
 *   adb shell am start -W -a android.intent.action.VIEW -d fieldmaps://gallery
 *
 * The Day / Dusk switch at the top writes the observer's screen preference, so the choice stays
 * after the gallery closes. "Open the states screen" leads to (dev)/states, which switches the sign-in
 * gate and the data source. Screens compose these primitives and never restyle them; if something
 * looks wrong here, fix the primitive, not the screen.
 */
import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";
import { type ReactNode, useState } from "react";
import { StyleSheet, View } from "react-native";
import { MIN_PASSWORD_LENGTH } from "../../src/features/auth/rules";
import {
  AnswerGrid,
  AnswerTile,
  Avatar,
  Button,
  type ButtonSize,
  type ButtonVariant,
  Checkbox,
  CodeInput,
  type Fact,
  FactsList,
  Field,
  Icon,
  IconButton,
  InnerPanel,
  Island,
  ListRow,
  Logo,
  type ModeStep,
  ModeStrip,
  Mono,
  Note,
  type NoteTone,
  NumberStepper,
  OnlineIndicator,
  PasswordInput,
  ProgressBar,
  ProposalNote,
  type RadioOption,
  RadioRows,
  type Scheme,
  Screen,
  ScreenHeader,
  ScreenState,
  type ScreenStateKind,
  Segmented,
  type SegmentedOption,
  Skeleton,
  STATE_KINDS,
  STATES,
  StateBadge,
  type StateKey,
  type StateKind,
  StatusLine,
  StepBars,
  Switch,
  TabDock,
  Text,
  Textarea,
  TextInput,
  TextLink,
  type Theme,
  TYPE,
  type TypeRole,
  useHaptics,
  usePreferences,
  useStyles,
  useTheme,
} from "../../src/ui";

const SCREEN_OPTIONS: readonly SegmentedOption<Scheme>[] = [
  { value: "day", label: "Day" },
  { value: "dusk", label: "Dusk" },
];

const HAND_OPTIONS: readonly SegmentedOption<"left" | "right">[] = [
  { value: "left", label: "Left hand" },
  { value: "right", label: "Right hand" },
];

const BUTTON_VARIANTS: readonly ButtonVariant[] = [
  "primary",
  "ink",
  "outline",
  "soft",
  "danger",
  "danger-solid",
  "link",
];
const BUTTON_SIZES: readonly ButtonSize[] = ["md", "collector", "sm"];

const NOTE_TONES: readonly { tone: NoteTone; title: string; body: string }[] = [
  {
    tone: "saved",
    title: "Required answers are complete.",
    body: "Saving stores it on this device.",
  },
  {
    tone: "waiting",
    title: "5 records are waiting on this device.",
    body: "They upload only from their owner's account.",
  },
  { tone: "uploaded", title: "Uploading 1 of 3.", body: "Keep the app open." },
  {
    tone: "attention",
    title: "The observer code is missing from this record.",
    body: "Add it, then send it again.",
  },
  { tone: "held", title: "Held by the project.", body: "Nothing for you to do yet." },
  { tone: "ink", title: "Map v3 is active.", body: "Every new record uses it." },
  { tone: "accent", title: "One observation is unfinished.", body: "Pick it up from Projects." },
  { tone: "neutral", title: "", body: "The target is illustrative, not a scheduled assignment." },
];

const ZONES: readonly RadioOption<string>[] = [
  { value: "north", label: "North meadow" },
  { value: "woodland", label: "Woodland edge", description: "7 observations so far" },
  { value: "sand", label: "Sand area", description: "Not in this map package", disabled: true },
];

const PLAY_TYPES = [
  "Physical",
  "Exploratory",
  "Play with Rules",
  "Non-Play",
  "Restorative or quiet play, alone or with one other child, away from the main group",
] as const;

const AGE_RANGES = ["0–2 yrs", "3–5 yrs", "6–8 yrs"] as const;

const FACTS: readonly Fact[] = [
  { label: "Version", value: "v3", mono: true },
  { label: "Size", value: "84 MB", mono: true },
  { label: "Form", value: "demo-v1", mono: true },
  { label: "State", value: <StateBadge kind="package" state="active" /> },
  {
    label: "Imported from",
    value: "QGIS project riverside.qgz, exported by Janet Loebach on Sep 30",
  },
];

const SAVED_FACTS: readonly Fact[] = [
  { label: "Carried forward", value: "Zone, round, observer" },
  { label: "Cleared", value: "Point and answers" },
  { label: "Upload", value: <StateBadge kind="queue" state="onDevice" size="sm" /> },
];

const SCREEN_STATES: readonly ScreenStateKind[] = [
  "loading",
  "empty",
  "error",
  "offline",
  "no-access",
];

const PACKAGE_MB = 126;

function galleryStyles(t: Theme) {
  return StyleSheet.create({
    intro: { gap: t.space.s2, marginBottom: t.space.s6 },
    content: { gap: t.space.s8 },
    section: { gap: t.space.s4 },
    sectionHead: {
      gap: t.space.s1,
      paddingTop: t.space.s4,
      borderTopWidth: t.size.border,
      borderTopColor: t.c.line,
    },
    stack: { gap: t.space.s3 },
    wide: { gap: t.space.s5 },
    row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.s3 },
    kind: { gap: t.space.s2 },
    rule: { borderTopWidth: t.size.border, borderTopColor: t.c.rule },
    thumb: { alignItems: "center", justifyContent: "center" },
    frame: {
      gap: t.space.s3,
      padding: t.space.s4,
      borderRadius: t.radius.island,
      borderWidth: t.size.border,
      borderColor: t.c.line,
    },
    dockFrame: { height: t.layout.dockHeight + t.space.s7 },
    ink: { padding: t.space.s4, borderRadius: t.radius.panel, backgroundColor: t.c.ink },
  });
}

/** A gallery section: a mono eyebrow over a page-role title, then the specimens. */
function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const s = useStyles(galleryStyles);
  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <Text variant="monoLabel" tone="ink2">
          {eyebrow}
        </Text>
        <Text variant="page" header>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

/** A caption over a specimen. */
function Specimen({ label, children }: { label: string; children: ReactNode }) {
  const s = useStyles(galleryStyles);
  return (
    <View style={s.stack}>
      <Text variant="monoLabel" tone="ink2">
        {label}
      </Text>
      {children}
    </View>
  );
}

export default function GalleryScreen() {
  const s = useStyles(galleryStyles);
  const preferences = usePreferences();

  return (
    <Screen scroll keyboard testID="contour-gallery">
      <ScreenHeader back showOnline avatar="PS" />
      <View style={s.intro}>
        <Text variant="monoLabel" tone="ink2">
          Contour · collector · dev only
        </Text>
        <Text variant="display" header>
          Gallery
        </Text>
        <Text variant="body" tone="ink2">
          Every primitive in every state. The screen choice below is the real preference.
        </Text>
        <Field label="Screen" hint="Dusk is a choice. Day stays the default everywhere.">
          <Segmented
            options={SCREEN_OPTIONS}
            value={preferences.screen}
            onValueChange={(screen) => preferences.set("screen", screen)}
            label="Screen theme"
            testID="gallery-scheme"
          />
        </Field>
        <TextLink
          label="Open the states screen"
          arrow="right"
          onPress={() => router.push("/states")}
          accessibilityHint="Switches the sign-in gate, the data source and the screen theme."
          testID="gallery-states"
        />
      </View>

      <View style={s.content}>
        <TypeSection />
        <ButtonSection />
        <IconButtonSection />
        <LinkSection />
        <IslandSection />
        <NoteSection />
        <StateSection />
        <DataSection />
        <StatusSection />
        <TextFieldSection />
        <ChoiceSection />
        <CollectSection />
        <ProgressSection />
        <ScreenStateSection />
        <NavigationSection />
      </View>
    </Screen>
  );
}

function TypeSection() {
  const s = useStyles(galleryStyles);
  const roles = Object.keys(TYPE).filter((role) => !role.startsWith("$")) as TypeRole[];
  return (
    <Section eyebrow="Type · mobile roles" title="Text roles">
      <View style={s.stack}>
        {roles.map((role) => (
          <View key={role}>
            <Text variant="monoLabel" tone="ink2">
              {role}
            </Text>
            <Text variant={role}>
              {role.startsWith("mono") ? "OBS-0249 · MAP v3 · DECA2026" : "Fieldwork starts here."}
            </Text>
          </View>
        ))}
      </View>
      <Specimen label="Mono">
        <View style={s.row}>
          <Mono>MAP v3</Mono>
          <Mono variant="label">Next observation</Mono>
          <Mono size="bodyStrong">OBS-0249</Mono>
          <Mono size="body" tone="ink2">
            demo-v1
          </Mono>
        </View>
        <Mono variant="code" selectable>
          DECA2026
        </Mono>
        <Mono variant="title" header>
          OBS-0249
        </Mono>
      </Specimen>
      <Specimen label="Text tones">
        <View style={s.row}>
          <Text tone="ink">ink</Text>
          <Text tone="ink2">ink2</Text>
          <Text tone="accent">accent</Text>
          <Text tone="saved">saved</Text>
          <Text tone="waiting">waiting</Text>
          <Text tone="uploaded">uploaded</Text>
          <Text tone="attention">attention</Text>
          <Text tone="held">held</Text>
        </View>
        <View style={s.ink}>
          <Text tone="onInk">onInk on an ink fill</Text>
        </View>
      </Specimen>
    </Section>
  );
}

function ButtonSection() {
  const s = useStyles(galleryStyles);
  const [busy, setBusy] = useState(false);
  const save = () => {
    setBusy(true);
    setTimeout(() => setBusy(false), 1600);
  };
  return (
    <Section eyebrow="Actions" title="Buttons">
      <Specimen label="Variants · md 56">
        <View style={s.stack}>
          {BUTTON_VARIANTS.map((variant) => (
            <Button
              key={variant}
              variant={variant}
              label={variant === "danger-solid" ? "Request account deletion" : `Variant ${variant}`}
              icon={variant === "danger-solid" ? "triangle-alert" : undefined}
              onPress={() => undefined}
            />
          ))}
        </View>
      </Specimen>
      <Specimen label="Sizes · collector 60, md 56, sm 44 (48 target)">
        <View style={s.stack}>
          {BUTTON_SIZES.map((size) => (
            <View key={size} style={s.row}>
              <Button size={size} label={`Size ${size}`} onPress={() => undefined} />
              <Button
                size={size}
                variant="outline"
                icon="list"
                label="Review observations"
                onPress={() => undefined}
              />
            </View>
          ))}
        </View>
      </Specimen>
      <Specimen label="Icons and full width">
        <Button
          size="collector"
          icon="smartphone"
          label="Save on this device"
          fullWidth
          onPress={() => undefined}
        />
        <Button
          variant="ink"
          label="Review"
          iconRight="arrow-right"
          fullWidth
          onPress={() => undefined}
        />
        <Button variant="outline" icon="arrow-left" label="Back" onPress={() => undefined} />
      </Specimen>
      <Specimen label="Link tones">
        <View style={s.row}>
          <Button variant="link" label="Keep my account" onPress={() => undefined} />
          <Button variant="link" tone="ink" label="Not now" onPress={() => undefined} />
          <Button
            variant="link"
            tone="attention"
            label="Delete account"
            onPress={() => undefined}
          />
        </View>
      </Specimen>
      <Specimen label="Busy · press to try">
        <Button
          size="collector"
          icon="smartphone"
          label="Save on this device"
          busyLabel="Saving on this device…"
          busy={busy}
          fullWidth
          onPress={save}
        />
        <Button
          variant="ink"
          label="Verify email"
          busy
          busyLabel="Verifying email…"
          onPress={save}
        />
      </Specimen>
      <Specimen label="Disabled, with its reason">
        <Button
          icon="lock"
          label="Save new password"
          disabled
          disabledReason="The button turns on when both passwords match."
          fullWidth
          onPress={() => undefined}
        />
        <Button
          variant="outline"
          label="Transfer ownership"
          disabled
          disabledReason="Only the owner can transfer the organization."
          onPress={() => undefined}
        />
      </Specimen>
    </Section>
  );
}

function IconButtonSection() {
  const s = useStyles(galleryStyles);
  const [layers, setLayers] = useState(false);
  return (
    <Section eyebrow="Actions" title="Icon buttons">
      <Specimen label="plain · outline · ink · disabled">
        <View style={s.row}>
          <IconButton icon="x" label="Close" onPress={() => undefined} />
          <IconButton icon="arrow-left" label="Back" variant="outline" onPress={() => undefined} />
          <IconButton icon="plus" label="Add" variant="ink" onPress={() => undefined} />
          <IconButton
            icon="minus"
            label="Zoom out, farthest zoom reached"
            variant="outline"
            disabled
            onPress={() => undefined}
          />
        </View>
      </Specimen>
      <Specimen label="Map controls · 44 on a ledge · layers toggles">
        <View style={s.row}>
          <IconButton icon="plus" label="Zoom in" variant="map" onPress={() => undefined} />
          <IconButton icon="minus" label="Zoom out" variant="map" onPress={() => undefined} />
          <IconButton
            icon="layers"
            label="Map layers"
            variant="map"
            selected={layers}
            onPress={() => setLayers((open) => !open)}
          />
          <IconButton
            icon="locate-fixed"
            label="Centre the map"
            variant="map"
            disabled
            onPress={() => undefined}
          />
        </View>
      </Specimen>
    </Section>
  );
}

function LinkSection() {
  return (
    <Section eyebrow="Actions" title="Text links">
      <TextLink label="Open North meadow" arrow="right" onPress={() => undefined} />
      <TextLink label="Back to projects" arrow="left" onPress={() => undefined} />
      <TextLink label="Read the offline field guide" icon="book-open" onPress={() => undefined} />
      <TextLink label="Discard draft" tone="ink" onPress={() => undefined} />
      <TextLink label="Resend in 0:24" disabled onPress={() => undefined} />
    </Section>
  );
}

function IslandSection() {
  const s = useStyles(galleryStyles);
  const { c } = useTheme();
  return (
    <Section eyebrow="Containers" title="Islands and panels">
      <Island
        title="Map package v3"
        meta={<StateBadge kind="readiness" state="readyOffline" />}
        description="84 MB on this device · verified today 11:25"
        footer="An offline device cannot report its current state."
      >
        <Text>The default island: white, a 1 px line and the 6 px ledge.</Text>
      </Island>
      <Island eyebrow="This device" title="Recorded answers" meta="3 items">
        <Text tone="ink2">An eyebrow, a title and a count.</Text>
      </Island>
      <Island tone="saved" eyebrow="Saved on this device" title="OBS-0249">
        <FactsList items={SAVED_FACTS} />
      </Island>
      <Island tone="accent" eyebrow="Unfinished observation" title="North meadow · Round 1">
        <Text tone="ink2">Point placed, 2 of 6 answered.</Text>
      </Island>
      <Island tone="danger" eyebrow="Needs attention" title="OBS-0248 was turned away">
        <Text>The observer code is missing. Add it, then send it again.</Text>
      </Island>
      <Island title="Inner panels">
        <View style={s.stack}>
          <InnerPanel>
            <Text variant="bodyStrong">Collecting works as usual</Text>
            <Text tone="ink2">Map v3 and form demo-v1 are on this device.</Text>
          </InnerPanel>
          <InnerPanel tone="well">
            <Text variant="monoLabel" tone="ink2">
              Copy this code now
            </Text>
            <Mono variant="code" selectable>
              DECA2026
            </Mono>
          </InnerPanel>
          <InnerPanel dashed style={s.thumb}>
            <Icon name="map" size={24} color={c.ink2} />
            <Text variant="small" tone="ink2" align="center">
              The map appears here once the package is on this device.
            </Text>
          </InnerPanel>
        </View>
      </Island>
    </Section>
  );
}

function NoteSection() {
  return (
    <Section eyebrow="Containers" title="Notes and proposals">
      {NOTE_TONES.map(({ tone, title, body }) => (
        <Note key={tone} tone={tone} title={title || undefined}>
          {body}
        </Note>
      ))}
      <Note
        tone="waiting"
        icon="smartphone"
        title="5 records are waiting on this device."
        action={<TextLink label="Review observations" arrow="right" onPress={() => undefined} />}
      >
        They upload only from their owner's account.
      </Note>
      <ProposalNote code="U5">The Approved-only gate is optional and not decided.</ProposalNote>
      <ProposalNote kind="notStored">This answer is shown for review and not stored.</ProposalNote>
      <ProposalNote kind="protocolNote">Count each child once per round.</ProposalNote>
    </Section>
  );
}

/** Every state of one kind, generated from the contract. */
function KindBadges<K extends StateKind>({ kind }: { kind: K }) {
  const s = useStyles(galleryStyles);
  const keys = Object.keys(STATES[kind]) as StateKey<K>[];
  return (
    <View style={s.kind}>
      <Text variant="monoLabel" tone="ink2">
        {kind}
      </Text>
      <View style={s.row}>
        {keys.map((key) => (
          <StateBadge key={key} kind={kind} state={key} />
        ))}
      </View>
    </View>
  );
}

function StateSection() {
  const s = useStyles(galleryStyles);
  return (
    <Section eyebrow="State · glyph, word and colour" title="State badges">
      {STATE_KINDS.map((kind) => (
        <KindBadges key={kind} kind={kind} />
      ))}
      <Specimen label="Sizes · sm, md, lg">
        <View style={s.row}>
          <StateBadge kind="queue" state="attention" size="sm" />
          <StateBadge kind="queue" state="attention" />
          <StateBadge kind="queue" state="attention" size="lg" />
        </View>
      </Specimen>
      <Specimen label="Adapted words and a one-off state">
        <View style={s.row}>
          <StateBadge kind="readiness" state="readyOffline" label="1 site ready offline" />
          <StateBadge label="Upload waiting · offline" icon="wifi-off" tone="waiting" />
        </View>
      </Specimen>
    </Section>
  );
}

function DataSection() {
  const s = useStyles(galleryStyles);
  const { c } = useTheme();
  return (
    <Section eyebrow="Data" title="Rows, facts and people">
      <Island title="Observations" meta="5 on device" padded={false}>
        <ListRow
          title={<Mono size="bodyStrong">OBS-0249</Mono>}
          subtitle="North meadow · Round 1 · 11:34"
          trailing={<StateBadge kind="queue" state="onDevice" size="sm" />}
          onPress={() => undefined}
        />
        <ListRow
          tone="attention"
          title={<Mono size="bodyStrong">OBS-0248</Mono>}
          subtitle="Woodland edge · Round 1 · 11:28"
          trailing={<StateBadge kind="queue" state="attention" size="sm" />}
          onPress={() => undefined}
        />
        <ListRow
          title={<Mono size="bodyStrong">OBS-0247</Mono>}
          subtitle="Sand area · Round 1 · 11:20"
          trailing={<StateBadge kind="queue" state="uploaded" size="sm" />}
          onPress={() => undefined}
        />
        <ListRow title="Read-only row" subtitle="No chevron, no press" />
        <ListRow
          title="Observer code"
          subtitle="PS"
          trailing={<TextLink label="Edit" onPress={() => undefined} />}
        />
        <ListRow
          title="Disabled row"
          subtitle="Joining needs a connection"
          disabled
          onPress={() => undefined}
        />
      </Island>
      <Island padded={false}>
        <ListRow
          divider={false}
          title="Riverside"
          subtitle="3 zones · Map v3"
          status={<StateBadge kind="readiness" state="readyOffline" />}
          thumbnail={
            <View style={s.thumb}>
              <Icon name="map-pinned" size={24} color={c.ink} />
            </View>
          }
          onPress={() => undefined}
        />
        <ListRow
          title="Fall Creek"
          subtitle="2 zones · 126 MB"
          status={<StateBadge kind="readiness" state="notDownloaded" />}
          thumbnail={{ icon: "download" }}
          onPress={() => undefined}
        />
        <ListRow
          icon="settings"
          title="Preferences"
          subtitle="Screen, hand, haptics"
          onPress={() => undefined}
        />
        <ListRow icon="book-open" title="Offline field guide" onPress={() => undefined} />
      </Island>
      <Island title="Facts list">
        <FactsList items={FACTS} />
      </Island>
      <Specimen label="Facts on the ground">
        <FactsList items={SAVED_FACTS} surface="ground" />
      </Specimen>
      <Specimen label="Avatars · ink, well, large, pressable">
        <View style={s.row}>
          <Avatar name="Pratyush Sudhakar" />
          <Avatar initials="JL" tone="well" />
          <Avatar name="Janet Loebach" size="lg" />
          <Avatar
            name="Pratyush Sudhakar"
            accessibilityLabel="Account, Pratyush Sudhakar"
            onPress={() => undefined}
          />
        </View>
      </Specimen>
    </Section>
  );
}

function StatusSection() {
  const s = useStyles(galleryStyles);
  const [saved, setSaved] = useState(0);
  return (
    <Section eyebrow="Feedback" title="Status lines and connection">
      <StatusLine
        tone="saved"
        icon="check"
        text={saved > 0 ? `OBS-02${49 + saved} saved on this device` : "Ready offline"}
        trailing={`${2 + saved} on device`}
        live
      />
      <Button
        variant="outline"
        size="sm"
        label="Save another (announced)"
        onPress={() => setSaved((count) => count + 1)}
      />
      <StatusLine
        tone="waiting"
        icon="wifi-off"
        text="Upload waiting · offline"
        trailing="1 of 2 · 84 MB"
      />
      <StatusLine tone="attention" icon="triangle-alert" text="1 record needs attention" />
      <StatusLine icon="smartphone" text="Downloads on this device" trailing="210 MB" />
      <Specimen label="Online indicator · device, forced online, forced offline">
        <View style={s.row}>
          <OnlineIndicator />
          <OnlineIndicator online />
          <OnlineIndicator online={false} />
        </View>
      </Specimen>
    </Section>
  );
}

function TextFieldSection() {
  const [name, setName] = useState("Play Study");
  const [initials, setInitials] = useState("");
  const [password, setPassword] = useState("riverside-meadow-17");
  const [confirm, setConfirm] = useState("riverside-meadow");
  const [notes, setNotes] = useState(
    "Two children moved between the slide and the sand area during the scan.",
  );
  const [otp, setOtp] = useState("7305");
  const [join, setJoin] = useState("DECA2026");
  const [verified, setVerified] = useState(false);
  const initialsError =
    initials.length > 0 && !/^[A-Z]{1,10}$/.test(initials)
      ? "Enter up to 10 uppercase characters"
      : undefined;
  const longEnough = password.length >= MIN_PASSWORD_LENGTH;
  const matches = confirm === password;

  return (
    <Section eyebrow="Inputs" title="Text fields and codes">
      <Field label="Project name" hint="Short and unique. It appears in export file names.">
        <TextInput value={name} onChangeText={setName} />
      </Field>
      <Field label="Observer initials" error={initialsError} hint="Up to ten uppercase characters.">
        <TextInput
          value={initials}
          onChangeText={setInitials}
          placeholder="e.g. PS"
          autoCapitalize="characters"
          invalid={initialsError === undefined ? undefined : true}
        />
      </Field>
      <Field label="Observer initials (error)" error="Enter up to 10 uppercase characters">
        <TextInput value="ps!" />
      </Field>
      <Field label="Field identifier" hint="Read-only. Stable across wording edits.">
        <TextInput value="age_range" readOnly mono />
      </Field>
      <Field
        label="New password"
        success={longEnough ? `${password.length} characters` : undefined}
        hint="At least 8."
      >
        <PasswordInput value={password} onChangeText={setPassword} newPassword />
      </Field>
      <Field label="Confirm new password" error={matches ? undefined : "Does not match yet"}>
        <PasswordInput value={confirm} onChangeText={setConfirm} newPassword />
      </Field>
      <Button
        icon={matches && longEnough ? "check" : "lock"}
        label="Save new password"
        disabled={!(matches && longEnough)}
        disabledReason="The button turns on when both passwords match."
        fullWidth
        onPress={() => undefined}
      />
      <Field label="Notes" hint="Saved to the draft as you type.">
        <Textarea value={notes} onChangeText={setNotes} maxLength={1000} />
      </Field>
      <Specimen label="Textarea outside a Field draws its own counter">
        <Textarea defaultValue="" maxLength={200} rows={3} accessibilityLabel="Free notes" />
      </Specimen>
      <Field label="Six-digit recovery code" success={verified ? "Code complete" : undefined}>
        <CodeInput
          kind="otp"
          value={otp}
          onChangeText={(code) => {
            setOtp(code);
            if (code.length < 6) setVerified(false);
          }}
          onComplete={() => setVerified(true)}
        />
      </Field>
      <Field label="Join code" hint="Eight letters and digits, from your coordinator.">
        <CodeInput kind="join" value={join} onChangeText={setJoin} />
      </Field>
    </Section>
  );
}

function ChoiceSection() {
  const s = useStyles(galleryStyles);
  const preferences = usePreferences();
  const [required, setRequired] = useState(true);
  const [privacy, setPrivacy] = useState(false);
  const [zone, setZone] = useState<string | null>("north");
  return (
    <Section eyebrow="Inputs" title="Choices and toggles">
      <Specimen label="Checkbox · checked, unchecked, disabled">
        <Checkbox label="Required when visible" checked={required} onCheckedChange={setRequired} />
        <Checkbox
          label="I have read the privacy information"
          description="What FieldMaps stores, where, and for how long."
          checked={privacy}
          onCheckedChange={setPrivacy}
        />
        <Checkbox
          label="Share with other projects"
          checked={false}
          disabled
          onCheckedChange={() => undefined}
        />
      </Specimen>
      <Specimen label="Switch · real preferences">
        <Island padded={false}>
          <Switch
            label="Haptics on save"
            description="A short tap when a record is stored on this device."
            checked={preferences.haptics}
            onCheckedChange={(on) => preferences.set("haptics", on)}
          />
          <Switch
            label="Larger question text"
            description="Adds to the text size set on your device."
            checked={preferences.largerText}
            onCheckedChange={(on) => preferences.set("largerText", on)}
            style={s.rule}
          />
          <Switch
            label="Upload on mobile data"
            description="Turned off by your organization."
            checked={false}
            disabled
            onCheckedChange={() => undefined}
            style={s.rule}
          />
        </Island>
      </Specimen>
      <Field
        label="Preferred hand"
        hint="In landscape, answers and Save sit on this side so the thumb reaches them."
      >
        <Segmented
          options={HAND_OPTIONS}
          value={preferences.hand}
          onValueChange={(hand) => preferences.set("hand", hand)}
          label="Preferred hand"
        />
      </Field>
      <Field label="Zone" hint="Where this session collects.">
        <RadioRows options={ZONES} value={zone} onValueChange={setZone} label="Zone" />
      </Field>
    </Section>
  );
}

function CollectSection() {
  const haptics = useHaptics();
  const [play, setPlay] = useState<string | null>("Physical");
  const [ages, setAges] = useState<ReadonlySet<string>>(new Set(["3–5 yrs"]));
  const [round, setRound] = useState(1);
  const [step, setStep] = useState<ModeStep>(1);
  const atLastRound = round >= 3;
  return (
    <Section eyebrow="Collecting" title="Answers and steps">
      <Specimen label="Mode strip · tap a finished step">
        <ModeStrip steps={["Place", "Answer", "Review"]} current={step} onSelect={setStep} />
        <Button
          variant="ink"
          size="sm"
          label={step === 2 ? "Start again" : "Next step"}
          onPress={() => setStep(step === 0 ? 1 : step === 1 ? 2 : 0)}
        />
      </Specimen>
      <Specimen label="Answer tiles · single choice, long label wraps">
        <Text variant="question" header>
          Primary play type
        </Text>
        <AnswerGrid>
          {PLAY_TYPES.map((label) => (
            <AnswerTile
              key={label}
              label={label}
              selected={play === label}
              onPress={() => {
                haptics.selection();
                setPlay(label);
              }}
            />
          ))}
          <AnswerTile
            key="unclear"
            label="Unclear"
            selected={false}
            disabled
            onPress={() => undefined}
          />
        </AnswerGrid>
      </Specimen>
      <Specimen label="Answer tiles · several, three across">
        <AnswerGrid columns={3}>
          {AGE_RANGES.map((label) => (
            <AnswerTile
              key={label}
              label={label}
              multiple
              selected={ages.has(label)}
              onPress={() => {
                haptics.selection();
                setAges((current) => {
                  const next = new Set(current);
                  if (next.has(label)) next.delete(label);
                  else next.add(label);
                  return next;
                });
              }}
            />
          ))}
        </AnswerGrid>
      </Specimen>
      <Field
        label="Round"
        hint={atLastRound ? "Round 3 is the last in this protocol." : "Rounds 1–3."}
      >
        <NumberStepper value={round} onChange={setRound} min={1} max={3} label="Round" />
      </Field>
    </Section>
  );
}

function ProgressSection() {
  const s = useStyles(galleryStyles);
  const [mb, setMb] = useState(60);
  return (
    <Section eyebrow="Progress" title="Steps and transfers">
      <View style={s.row}>
        <StepBars count={2} current={1} align="start" />
        <StepBars count={2} current={2} align="start" />
      </View>
      <ProgressBar
        value={mb}
        max={PACKAGE_MB}
        label="Map package v1 download"
        detail={`${mb} of ${PACKAGE_MB} MB`}
      />
      <Button
        variant="outline"
        size="sm"
        label={mb >= PACKAGE_MB ? "Start over" : "Download 22 MB more"}
        onPress={() =>
          setMb((current) => (current >= PACKAGE_MB ? 0 : Math.min(PACKAGE_MB, current + 22)))
        }
      />
      <ProgressBar value={1} label="Map package v3 download" detail="126 of 126 MB" />
      <ProgressBar value={0.25} label="Upload" showPercent={false} detail="1 of 4 records" />
    </Section>
  );
}

function ScreenStateSection() {
  const s = useStyles(galleryStyles);
  const actions: Record<ScreenStateKind, ReactNode> = {
    loading: null,
    empty: <Button label="Go to projects" iconRight="arrow-right" onPress={() => undefined} />,
    error: <Button variant="ink" icon="rotate-cw" label="Try again" onPress={() => undefined} />,
    offline: (
      <Button
        size="collector"
        icon="crosshair"
        label="Start collection"
        onPress={() => undefined}
      />
    ),
    "no-access": (
      <Button
        variant="outline"
        icon="arrow-left"
        label="Back to projects"
        onPress={() => undefined}
      />
    ),
  };
  return (
    <Section eyebrow="Feedback" title="Screen states">
      {SCREEN_STATES.map((kind) => (
        <Specimen key={kind} label={kind}>
          <View style={s.frame}>
            <Text variant="island" header>
              Observations
            </Text>
            <ScreenState kind={kind} action={actions[kind]} />
          </View>
        </Specimen>
      ))}
      <Specimen label="Skeleton · appears after 400 ms, never shimmers">
        <Skeleton rows={2} caption="Loading map packages…" />
      </Specimen>
    </Section>
  );
}

/** The dock outside a navigator: a stand-in for the three tabs, so it can be seen in both themes. */
const DOCK_ROUTES = [
  { key: "dock-projects", name: "(projects)" },
  { key: "dock-observations", name: "observations" },
  { key: "dock-account", name: "account" },
] as const;

function DockPreview() {
  const s = useStyles(galleryStyles);
  const [index, setIndex] = useState(0);
  // Only what TabDock reads; the real props come from expo-router's Tabs.
  const props = {
    state: {
      key: "dock-preview",
      index,
      routes: DOCK_ROUTES,
      routeNames: DOCK_ROUTES.map((route) => route.name),
      type: "tab",
      stale: false,
      history: [],
      preloadedRouteKeys: [],
    },
    descriptors: {
      "dock-projects": { options: {} },
      "dock-observations": { options: { tabBarBadge: 1 } },
      "dock-account": { options: {} },
    },
    navigation: {
      emit: () => ({ defaultPrevented: false }),
      navigate: (name: string) =>
        setIndex(
          Math.max(
            0,
            DOCK_ROUTES.findIndex((route) => route.name === name),
          ),
        ),
    },
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  } as unknown as BottomTabBarProps;
  return (
    <View style={s.dockFrame}>
      <TabDock {...props} />
    </View>
  );
}

function NavigationSection() {
  return (
    <Section eyebrow="Navigation" title="Headers, logo and dock">
      <Specimen label="Tab root · logo, online, account">
        <ScreenHeader showOnline avatar="PS" />
      </Specimen>
      <Specimen label="Back · title and subtitle">
        <ScreenHeader back={() => undefined} title="Riverside" subtitle="North meadow · Round 1" />
      </Specimen>
      <Specimen label="Close · mark opposite">
        <ScreenHeader back={() => undefined} backIcon="close" trailing={<Logo />} />
      </Specimen>
      <Specimen label="Tab dock · tap a tab">
        <DockPreview />
      </Specimen>
    </Section>
  );
}
