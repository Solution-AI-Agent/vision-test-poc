import { useEffect, useState, type ReactNode } from "react";
import {
  Eye,
  Play,
  Square,
  ArrowUpRight,
  Settings2,
  ScanLine,
  FlaskConical,
  FileSearch,
  KeyRound,
  Save,
  Trash2,
  Moon,
  Sun,
  Monitor,
  ShieldCheck,
  Download,
  CircleDot,
  Clock,
  Cpu,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Run, Finding } from "../server/domain";
import { cn } from "@/lib/utils";
type Config = {
  model: string;
  family: string;
  maxActions: number;
  maxCalls: number;
  maxSeconds: number;
  maxTokens: number;
  hasKey: boolean;
  connection: string;
  visionVerified: boolean;
  visionActed: boolean;
  keyStorage: string;
};
type Scenario = {
  id: string;
  name: string;
  url: string;
  task: string;
  expected: string;
};
const sample = {
  name: "YouTube 검색 결과 확인",
  url: "https://www.youtube.com/",
  task: "검색창에서 Midscene AI demo를 검색하고 검색 결과가 표시되는지 확인한다.",
  expected: "검색어에 해당하는 영상 결과 목록이 화면에 표시된다.",
};
const statuses: Record<string, string> = {
  running: "실행 중",
  completed: "완료",
  stopped: "중지됨",
  limited: "한도 도달",
  failed: "실패",
  candidate: "결함 후보",
  confirmed: "확인된 결함",
  "false-positive": "오탐",
  inconclusive: "판단 불가",
};
async function api<T>(url: string, method = "GET", data?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error);
  return result;
}
function FormField({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}
function StateBadge({ value }: { value: string }) {
  return (
    <Badge
      variant={
        value === "failed"
          ? "destructive"
          : value === "running"
            ? "default"
            : "secondary"
      }
    >
      {statuses[value] ?? value}
    </Badge>
  );
}
export default function App() {
  const [tab, setTab] = useState("workspace"),
    [config, setConfig] = useState<Config>(),
    [apiKey, setApiKey] = useState(""),
    [scenarios, setScenarios] = useState<Scenario[]>([]),
    [draft, setDraft] = useState(sample),
    [mode, setMode] = useState("autonomous"),
    [runs, setRuns] = useState<Run[]>([]),
    [selected, setSelected] = useState<string>(),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [dark, setDark] = useState(true),
    [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const current = runs.find((r) => r.id === selected) ?? runs[0],
    active = runs.some((r) => r.status === "running");
  async function load() {
    const [c, s, r] = await Promise.all([
      api<Config>("/settings"),
      api<Scenario[]>("/scenarios"),
      api<Run[]>("/runs"),
    ]);
    setConfig(c);
    setScenarios(s);
    setRuns(r);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  useEffect(() => {
    const id = setInterval(() => {
      Promise.all([api<Run[]>("/runs"), api<Config>("/settings")])
        .then(([r, c]) => {
          setRuns(r);
          setConfig((previous) =>
            previous
              ? {
                  ...previous,
                  hasKey: c.hasKey,
                  connection: c.connection,
                  visionVerified: c.visionVerified,
                  visionActed: c.visionActed,
                }
              : c,
          );
        })
        .catch((e) => setError(e.message));
    }, 1500);
    return () => clearInterval(id);
  }, []);
  async function perform(fn: () => Promise<void>) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveConfig() {
    if (!config) return;
    await perform(async () => {
      const {
        hasKey,
        connection,
        visionVerified,
        visionActed,
        keyStorage,
        ...value
      } = config;
      const saved = await api<Config>("/settings", "PUT", {
        ...value,
        ...(apiKey ? { apiKey } : {}),
      });
      setConfig(saved);
      setApiKey("");
      setNotice("설정을 적용했습니다. 키는 서버 메모리에만 보관됩니다.");
    });
  }
  async function start() {
    await perform(async () => {
      const run = await api<Run>("/runs", "POST", {
        mode,
        url: draft.url,
        task: mode === "scenario" ? draft.task : "",
        expected: mode === "scenario" ? draft.expected : "",
        query: "Midscene AI demo",
      });
      setSelected(run.id);
      setRuns((r) => [run, ...r]);
      setTab("workspace");
    });
  }
  const visionState = config?.visionVerified
    ? "화면 계획 응답 확인"
    : config?.connection === "connected"
      ? "인증 연결 확인 · Vision 미검증"
      : config?.hasKey
        ? "실호출 준비 · Vision 미검증"
        : "API 키 설정 필요";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="lab-sidebar">
        <a href="#" className="brand" aria-label="Vision QA Lab">
          <span className="brand-mark">
            <Eye />
          </span>
          <span>
            VISION<span className="text-muted-foreground"> / QA LAB</span>
          </span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="flex flex-col gap-2">
          {[
            { id: "workspace", label: "실행 워크스페이스", icon: ScanLine },
            { id: "evidence", label: "증거 & 검토", icon: FileSearch },
            { id: "settings", label: "모델 & 설정", icon: Settings2 },
          ].map((item) => (
            <Button
              key={item.id}
              variant={tab === item.id ? "secondary" : "ghost"}
              onClick={() => setTab(item.id)}
              className="justify-start"
            >
              <item.icon data-icon="inline-start" />
              {item.label}
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Web agent</span>
            <Badge variant="outline">PoC / 0.1</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Monitor className="size-4" />
            Windows · 준비 중 / 미검증
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDark(!dark)}>
            {dark ? (
              <Sun data-icon="inline-start" />
            ) : (
              <Moon data-icon="inline-start" />
            )}
            {dark ? "라이트 테마" : "다크 테마"}
          </Button>
        </div>
      </aside>
      <main className="lab-main">
        <header className="topbar">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FlaskConical className="size-4" />
            vision-test
            <ChevronRight className="size-4" />
            <span className="text-foreground">
              {tab === "settings"
                ? "OpenRouter 설정"
                : tab === "evidence"
                  ? "증거 검토"
                  : "Web 탐색"}
            </span>
          </div>
          <Badge variant="outline">YouTube · 비로그인 공개 화면</Badge>
        </header>
        <div className="page-body">
          <div className="page-heading">
            <div>
              <p className="eyebrow">SCREEN FIRST. EVIDENCE ALWAYS.</p>
              <h1>
                {tab === "settings"
                  ? "모델을 연결하고, 경계를 정하세요."
                  : tab === "evidence"
                    ? "관찰을 증거로, 후보를 판단으로."
                    : "화면에서 계획하는 QA."}
              </h1>
              <p className="text-muted-foreground mt-3">
                {tab === "settings"
                  ? "OpenRouter 인증과 실제 Vision 실행을 각각 확인합니다."
                  : tab === "evidence"
                    ? "전후 화면과 재현 절차를 확인한 뒤 독립적으로 판정하세요."
                    : "Vision이 다음 테스트를 선택하고, Playwright가 행동을 실행합니다."}
              </p>
            </div>
            <Badge variant={active ? "default" : "secondary"}>
              <CircleDot data-icon="inline-start" />
              {active
                ? "실행 중"
                : !config
                  ? "설정 읽는 중"
                  : config.hasKey
                    ? "Vision 실호출 준비"
                    : "키 설정 필요 · Vision 대기"}
            </Badge>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>요청을 완료하지 못했습니다</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {notice && (
            <Alert>
              <ShieldCheck />
              <AlertTitle>설정 상태</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          )}
          {tab === "settings" && config && (
            <div className="settings-grid">
              <Card>
                <CardHeader>
                  <CardTitle>OpenRouter 연결</CardTitle>
                  <CardDescription>
                    키는 브라우저 영구 저장소·리포트에 저장하지 않습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <FormField
                      id="api-key"
                      label="API 키"
                      description={
                        config.hasKey
                          ? "저장된 키가 있습니다. 새 키를 입력하면 교체합니다."
                          : "서버 프로세스 메모리 보관 · 재시작 시 삭제됩니다."
                      }
                    >
                      <Input
                        id="api-key"
                        type="password"
                        autoComplete="off"
                        placeholder="sk-or-…"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        disabled={active}
                      />
                    </FormField>
                    <FormField
                      id="model"
                      label="Vision 모델 ID"
                      description="이미지 입력을 지원하는 OpenRouter 모델의 정확한 ID를 입력하세요. 기본값의 실호출 호환성은 아직 미검증입니다."
                    >
                      <Input
                        id="model"
                        value={config.model}
                        onChange={(e) =>
                          setConfig({ ...config, model: e.target.value })
                        }
                        disabled={active}
                      />
                    </FormField>
                    <FormField
                      id="family"
                      label="Midscene 모델 계열"
                      description="좌표·모델 어댑터 설정을 위해 모델과 일치하는 계열을 선택하세요."
                    >
                      <Select
                        value={config.family}
                        onValueChange={(family) =>
                          setConfig({ ...config, family })
                        }
                        disabled={active}
                      >
                        <SelectTrigger id="family">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {[
                              "qwen3-vl",
                              "qwen2.5-vl",
                              "gemini",
                              "gpt-5",
                              "doubao-vision",
                              "vlm-ui-tars",
                            ].map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </FieldGroup>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  <Button onClick={saveConfig} disabled={busy || active}>
                    <Save data-icon="inline-start" />
                    설정 적용
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!config.hasKey || busy || active}
                    onClick={() =>
                      perform(async () => {
                        const result = await api<any>(
                          "/settings/check",
                          "POST",
                          {},
                        );
                        setNotice(result.note);
                        setConfig(await api<Config>("/settings"));
                      })
                    }
                  >
                    인증 연결 확인
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={!config.hasKey || busy || active}
                    onClick={() =>
                      perform(async () => {
                        setConfig(
                          await api<Config>("/settings/key", "DELETE", {}),
                        );
                        setApiKey("");
                        setNotice("API 키를 삭제했습니다.");
                      })
                    }
                  >
                    <Trash2 data-icon="inline-start" />키 삭제
                  </Button>
                </CardFooter>
              </Card>
              <div className="flex flex-col gap-5">
                <Card>
                  <CardHeader>
                    <CardTitle>실행 한도</CardTitle>
                    <CardDescription>
                      시간·행동·실제 모델 요청 수를 각각 제한합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup className="grid grid-cols-2 gap-5">
                      {[
                        {
                          key: "maxActions",
                          label: "최대 행동",
                          min: 1,
                          max: 40,
                        },
                        {
                          key: "maxCalls",
                          label: "최대 모델 호출",
                          min: 1,
                          max: 60,
                        },
                        {
                          key: "maxSeconds",
                          label: "최대 시간 (초)",
                          min: 10,
                          max: 600,
                        },
                        {
                          key: "maxTokens",
                          label: "응답 토큰 / 호출",
                          min: 256,
                          max: 4096,
                        },
                      ].map((item) => (
                        <FormField
                          key={item.key}
                          id={item.key}
                          label={item.label}
                        >
                          <Input
                            id={item.key}
                            type="number"
                            min={item.min}
                            max={item.max}
                            value={config[item.key as keyof Config] as number}
                            disabled={active}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                [item.key]: Number(e.target.value),
                              })
                            }
                          />
                        </FormField>
                      ))}
                    </FieldGroup>
                  </CardContent>
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      금액 상한은 지원하지 않습니다. 비용은 공급자가 응답한
                      사용량만 표시합니다.
                    </p>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>검증 상태</CardTitle>
                    <CardDescription>
                      준비·인증·화면 실행을 구분합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <StatusRow
                        label="키 / 설정"
                        value={config.hasKey ? "설정됨" : "미설정"}
                      />
                      <StatusRow
                        label="인증 연결"
                        value={
                          config.connection === "connected"
                            ? "연결 확인"
                            : config.connection === "error"
                              ? "연결 실패"
                              : "미검증"
                        }
                      />
                      <StatusRow
                        label="이미지 기반 계획"
                        value={
                          config.visionVerified
                            ? "화면 계획 응답 확인"
                            : "실행 미검증"
                        }
                      />
                      <StatusRow
                        label="Vision 계획 → 실제 행동"
                        value={
                          config.visionActed ? "행동 실행 확인" : "실행 미검증"
                        }
                      />
                      <StatusRow
                        label="Windows Native"
                        value="준비 중 · 미검증"
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      onClick={() => setTab("workspace")}
                    >
                      <ArrowUpRight data-icon="inline-start" />
                      실행으로 이동
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          )}
          {tab === "workspace" && (
            <>
              <div className="metrics-grid">
                <Metric
                  icon={<Eye />}
                  label="VISION READINESS"
                  value={visionState}
                />
                <Metric
                  icon={<Layers />}
                  label="SESSION RUNS"
                  value={`${runs.length}회`}
                  detail="실측 실행 기록"
                />
                <Metric
                  icon={<ShieldCheck />}
                  label="REVIEW QUEUE"
                  value={`${runs.reduce((n, r) => n + r.findings.filter((f) => f.status === "candidate").length, 0)}개`}
                  detail="독립 검토 전 결함 후보"
                />
              </div>
              <div className="workspace-grid">
                <Card>
                  <CardHeader>
                    <CardTitle>테스트 설계</CardTitle>
                    <CardDescription>
                      등록한 업무를 검증하거나, 화면에서 탐색을 시작하세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={mode} onValueChange={setMode}>
                      <TabsList className="w-full">
                        <TabsTrigger value="autonomous">자율 탐색</TabsTrigger>
                        <TabsTrigger value="scenario">
                          등록 시나리오
                        </TabsTrigger>
                        <TabsTrigger value="baseline">비교군</TabsTrigger>
                      </TabsList>
                      <TabsContent value="autonomous">
                        <Alert>
                          <ScanLine />
                          <AlertTitle>화면이 다음 테스트의 출발점</AlertTitle>
                          <AlertDescription>
                            고정 클릭 순서 없이 현재 화면에서 확인할 항목을
                            선택합니다. 발견은 결함 후보로 기록합니다.
                          </AlertDescription>
                        </Alert>
                      </TabsContent>
                      <TabsContent value="scenario">
                        <FieldGroup>
                          <FormField id="scenario-name" label="시나리오 이름">
                            <Input
                              id="scenario-name"
                              value={draft.name}
                              onChange={(e) =>
                                setDraft({ ...draft, name: e.target.value })
                              }
                            />
                          </FormField>
                          <FormField id="task" label="자연어 시나리오">
                            <Textarea
                              id="task"
                              rows={3}
                              value={draft.task}
                              onChange={(e) =>
                                setDraft({ ...draft, task: e.target.value })
                              }
                            />
                          </FormField>
                          <FormField id="expected" label="기대 결과">
                            <Textarea
                              id="expected"
                              rows={2}
                              value={draft.expected}
                              onChange={(e) =>
                                setDraft({ ...draft, expected: e.target.value })
                              }
                            />
                          </FormField>
                        </FieldGroup>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              perform(async () => {
                                await api("/scenarios", "POST", draft);
                                setScenarios(await api("/scenarios"));
                                setNotice("시나리오를 저장했습니다.");
                              })
                            }
                          >
                            <Save data-icon="inline-start" />
                            시나리오 저장
                          </Button>
                          {scenarios.map((s) => (
                            <Button
                              key={s.id}
                              variant="ghost"
                              size="sm"
                              onClick={() => setDraft(s)}
                            >
                              {s.name}
                            </Button>
                          ))}
                        </div>
                      </TabsContent>
                      <TabsContent value="baseline">
                        <Alert>
                          <FlaskConical />
                          <AlertTitle>사전 작성한 Playwright 비교군</AlertTitle>
                          <AlertDescription>
                            같은 검색 업무: YouTube 홈 → “Midscene AI demo” 입력
                            → 검색 결과 확인. 모델 호출 없이 locator를
                            사용합니다. 등록 시나리오의 기본 검색 업무와
                            비교하세요.
                          </AlertDescription>
                        </Alert>
                      </TabsContent>
                    </Tabs>
                    <FieldGroup className="mt-5">
                      <FormField
                        id="target-url"
                        label="대상 URL"
                        description="YouTube 공개 화면 · 로그인 및 계정 변경 행동 제외"
                      >
                        <Input
                          id="target-url"
                          value={draft.url}
                          onChange={(e) =>
                            setDraft({ ...draft, url: e.target.value })
                          }
                        />
                      </FormField>
                    </FieldGroup>
                  </CardContent>
                  <CardFooter className="flex flex-col items-stretch gap-3">
                    <Button
                      onClick={start}
                      disabled={
                        busy ||
                        active ||
                        (mode !== "baseline" && !config?.hasKey)
                      }
                    >
                      <Play data-icon="inline-start" />
                      {mode === "baseline"
                        ? "고정 검색 비교군 실행"
                        : mode === "autonomous"
                          ? "자율 탐색 시작"
                          : "시나리오 실행"}
                    </Button>
                    {!config?.hasKey && mode !== "baseline" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTab("settings")}
                      >
                        <KeyRound data-icon="inline-start" />
                        OpenRouter 키를 설정하세요
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {config?.maxActions ?? 8} 행동 · {config?.maxCalls ?? 10}{" "}
                      모델 호출 · {config?.maxSeconds ?? 120}초 / 최대
                    </p>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>실행 관찰</CardTitle>
                      {current && <StateBadge value={current.status} />}
                    </div>
                    <CardDescription>
                      {current?.stage ??
                        "첫 실행의 화면과 행동 계획이 여기에 나타납니다."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {current?.screenshot ? (
                      <div className="flex flex-col gap-4">
                        <img
                          className="screen-preview"
                          src={current.screenshot}
                          alt="QA 대상의 현재 캡처 화면"
                        />
                        <div className="run-stats">
                          <span>
                            <Cpu className="size-4" />
                            {current.calls} 호출 / {current.actions} 행동
                          </span>
                          <span>
                            <Clock className="size-4" />
                            {Math.round(
                              ((current.endedAt
                                ? new Date(current.endedAt).getTime()
                                : Date.now()) -
                                new Date(current.startedAt).getTime()) /
                                1000,
                            )}
                            초
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {current.steps.at(-1)?.plan.observation ??
                            "화면을 관찰하고 있습니다."}
                        </p>
                      </div>
                    ) : (
                      <Empty className="screen-empty">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ScanLine />
                          </EmptyMedia>
                          <EmptyTitle>
                            {current?.status === "running"
                              ? "브라우저 준비 중"
                              : current
                                ? "화면 수집 전 실행이 종료됐습니다"
                                : "아직 실행된 화면이 없습니다"}
                          </EmptyTitle>
                          <EmptyDescription>
                            {current?.error ??
                              "키 설정 후 Vision 실행을 시작하세요. 비교군은 키 없이 실행할 수 있습니다."}
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {current?.outcome ??
                        "모의 실행 데이터 없음 · 실제 기록만 표시"}
                    </p>
                    {active ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          perform(async () => {
                            const running = runs.find(
                              (r) => r.status === "running",
                            );
                            if (running)
                              await api(`/runs/${running.id}/stop`, "POST", {});
                            setRuns(await api("/runs"));
                          })
                        }
                      >
                        <Square data-icon="inline-start" />
                        중지
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!current}
                        onClick={() => setTab("evidence")}
                      >
                        증거 검토
                        <ArrowUpRight data-icon="inline-end" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </div>
            </>
          )}
          {tab === "evidence" && (
            <div className="evidence-grid">
              <Card>
                <CardHeader>
                  <CardTitle>실행 기록</CardTitle>
                  <CardDescription>
                    Vision과 고정 스크립트를 구분합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!runs.length ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>검토할 실행이 없습니다</EmptyTitle>
                        <EmptyDescription>
                          워크스페이스에서 첫 실행을 시작하세요.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {runs.map((r) => (
                        <Button
                          key={r.id}
                          variant={
                            current?.id === r.id ? "secondary" : "outline"
                          }
                          className="h-auto justify-start py-3"
                          onClick={() => setSelected(r.id)}
                        >
                          <span className="flex flex-col gap-1 items-start">
                            <span>
                              {r.input.mode === "baseline"
                                ? "Playwright 비교군"
                                : r.input.mode === "autonomous"
                                  ? "Vision 자율 탐색"
                                  : "Vision 시나리오"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(r.startedAt).toLocaleString("ko-KR")} ·{" "}
                              {statuses[r.status]}
                            </span>
                          </span>
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTab("workspace")}
                  >
                    새 실행 준비
                    <ArrowUpRight data-icon="inline-end" />
                  </Button>
                </CardFooter>
              </Card>
              <div className="flex flex-col gap-5">
                {current && (
                  <>
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>실행 요약</CardTitle>
                          <StateBadge value={current.status} />
                        </div>
                        <CardDescription>
                          {current.engine} · {current.settings.model}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                          <StatusRow label="결과" value={current.outcome} />
                          <StatusRow
                            label="행동 / 호출"
                            value={`${current.actions} / ${current.calls}`}
                          />
                          <StatusRow
                            label="응답 사용량"
                            value={`${current.tokens} tokens (응답 제공분)`}
                          />
                          <StatusRow
                            label="보고된 비용"
                            value={
                              current.cost === null
                                ? "조회 불가"
                                : `$${current.cost.toFixed(5)} (응답 제공분)`
                            }
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/api/runs/${current.id}/export`} download>
                            <Download data-icon="inline-start" />
                            JSON 내보내기
                          </a>
                        </Button>
                        {current.video && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={current.video} download>
                              원본 녹화 다운로드
                            </a>
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                    {current.findings.length === 0 ? (
                      <Card>
                        <CardHeader>
                          <CardTitle>결함 후보</CardTitle>
                          <CardDescription>
                            후보가 없다는 사실은 결함이 없음을 보장하지
                            않습니다.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Empty>
                            <EmptyHeader>
                              <EmptyMedia variant="icon">
                                <ShieldCheck />
                              </EmptyMedia>
                              <EmptyTitle>기록된 결함 후보 없음</EmptyTitle>
                              <EmptyDescription>
                                실행 단계의 관찰과 실패 원인을 함께 검토하세요.
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        </CardContent>
                        <CardFooter>
                          <Badge variant="outline">
                            YouTube 미탐률 산출 불가
                          </Badge>
                        </CardFooter>
                      </Card>
                    ) : (
                      current.findings.map((f) => (
                        <Card key={f.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle>{f.title}</CardTitle>
                              <StateBadge value={f.status} />
                            </div>
                            <CardDescription>
                              단계 {f.step + 1} · 독립 검토:{" "}
                              {f.reviewNote || "미검토"}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-col gap-4">
                              <p>{f.observed}</p>
                              <p className="text-sm text-muted-foreground">
                                기대: {f.expected}
                                <br />
                                근거: {f.basis}
                              </p>
                              <ol className="list-decimal pl-5 text-sm">
                                {f.reproduction.map((text, i) => (
                                  <li key={i}>{text}</li>
                                ))}
                              </ol>
                              <div className="grid grid-cols-2 gap-3">
                                <img
                                  className="screen-preview"
                                  src={f.before}
                                  alt="후보 발견 전 화면"
                                />
                                <img
                                  className="screen-preview"
                                  src={f.after}
                                  alt="후보 발견 후 화면"
                                />
                              </div>
                              <FieldGroup>
                                <FormField
                                  id={`review-${f.id}`}
                                  label="독립 검토 근거"
                                >
                                  <Textarea
                                    id={`review-${f.id}`}
                                    placeholder="재현 조건과 확인 결과를 적으세요"
                                    value={reviewNotes[f.id] ?? ""}
                                    onChange={(e) =>
                                      setReviewNotes({
                                        ...reviewNotes,
                                        [f.id]: e.target.value,
                                      })
                                    }
                                  />
                                </FormField>
                              </FieldGroup>
                            </div>
                          </CardContent>
                          <CardFooter className="flex flex-wrap gap-2">
                            {(
                              [
                                "confirmed",
                                "false-positive",
                                "inconclusive",
                              ] as Finding["status"][]
                            ).map((status) => (
                              <Button
                                key={status}
                                variant="outline"
                                size="sm"
                                disabled={busy || active}
                                onClick={() =>
                                  perform(async () => {
                                    await api(
                                      `/runs/${current.id}/findings/${f.id}`,
                                      "PATCH",
                                      { status, note: reviewNotes[f.id] ?? "" },
                                    );
                                    setRuns(await api("/runs"));
                                  })
                                }
                              >
                                {statuses[status]}
                              </Button>
                            ))}
                          </CardFooter>
                        </Card>
                      ))
                    )}
                    {current.goals?.map((goal, i) => (
                      <Card key={i}>
                        <CardHeader>
                          <CardTitle>자율 선택 테스트 가설</CardTitle>
                          <CardDescription>{goal.hypothesis}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col gap-3">
                            <p className="text-sm">업무: {goal.task}</p>
                            <p className="text-sm text-muted-foreground">
                              기대: {goal.expected}
                              <br />
                              화면 근거: {goal.basis}
                            </p>
                            <img
                              className="screen-preview"
                              src={goal.screenshot}
                              alt="자율 테스트 가설을 선택한 실제 모델 입력 화면"
                            />
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Badge variant="outline">
                            사용자 업무 입력 없이 화면에서 선택
                          </Badge>
                        </CardFooter>
                      </Card>
                    ))}
                    <Card>
                      <CardHeader>
                        <CardTitle>화면 → 계획 → 행동</CardTitle>
                        <CardDescription>
                          짧은 근거와 구조화된 행동을 전후 화면에 연결합니다.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-5">
                          {!current.steps.length && (
                            <p className="text-muted-foreground">
                              완료된 계획 단계가 없습니다.
                            </p>
                          )}
                          {current.steps.map((s) => (
                            <div key={s.index} className="step-row">
                              <div className="flex justify-between gap-3">
                                <Badge variant="outline">
                                  STEP {String(s.index + 1).padStart(2, "0")}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {s.executed
                                    ? "행동 실행됨"
                                    : s.plan.action.type === "finish"
                                      ? "종료 판단"
                                      : "미실행"}
                                </span>
                              </div>
                              <p className="text-sm mt-3">
                                {s.plan.observation}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {s.plan.rationale}
                              </p>
                              <code className="action-code">
                                {JSON.stringify(s.plan.action)}
                              </code>
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <a
                                  href={s.before}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img
                                    className="screen-preview"
                                    src={s.before}
                                    alt={`단계 ${s.index + 1} 전 화면`}
                                  />
                                </a>
                                <a
                                  href={s.after}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img
                                    className="screen-preview"
                                    src={s.after}
                                    alt={`단계 ${s.index + 1} 후 화면`}
                                  />
                                </a>
                              </div>
                              {s.error && (
                                <p className="text-destructive text-sm">
                                  {s.error}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <p className="text-xs text-muted-foreground">
                          후보 ≠ 확인된 결함 · 모델 판단 ≠ 독립 검증
                        </p>
                      </CardFooter>
                    </Card>
                  </>
                )}
              </div>
            </div>
          )}
          <footer className="page-footer">
            <span>VISION QA LAB / FEASIBILITY STUDY</span>
            <span>Midscene vision · Playwright actions · OpenRouter</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="metric">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs tracking-widest">{label}</span>
      </div>
      <p className={cn("mt-3", value.length > 15 ? "text-base" : "text-2xl")}>
        {value}
      </p>
      {detail && <p className="text-xs text-muted-foreground mt-1">{detail}</p>}
    </div>
  );
}
