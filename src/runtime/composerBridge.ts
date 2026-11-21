import type { RolePaletteTuple } from "@/types/momo";

export type { RolePaletteTuple };

export interface ComposerSnapshot {
  botName: string;
  roleId: string;
  isCustomBot: boolean;
  rolePalette: RolePaletteTuple;
  busy: boolean;
  dictating: boolean;
  dictateError?: string | null;
  sentSeq: number;
  inputValue: string;
  placeholder: string;
}

type Listener = (snap: ComposerSnapshot) => void;

const DEFAULT_PALETTE: RolePaletteTuple = [
  "#FBC2A2",
  "#EF8C66",
  "#DA6C4D",
  "#B5523C",
];

/**
 * Reactive bridge between the Momo WebGL/chat runtime and React `<MomoComposer />`.
 */
export function createComposerBridge() {
  let snap: ComposerSnapshot = {
    botName: "Momo",
    roleId: "rest",
    isCustomBot: false,
    rolePalette: DEFAULT_PALETTE,
    busy: false,
    dictating: false,
    dictateError: null,
    sentSeq: 0,
    inputValue: "",
    placeholder: "Tanya Momo apa saja",
  };

  const listeners = new Set<Listener>();

  let submitHandler: ((text: string) => void) | null = null;
  let valueSyncHandler: ((val: string) => void) | null = null;

  const emit = () => {
    listeners.forEach((fn) => fn(snap));
  };

  const patch = (partial: Partial<ComposerSnapshot>) => {
    snap = { ...snap, ...partial };
    emit();
  };

  return {
    getSnapshot: () => snap,
    subscribe: (fn: Listener) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    registerRuntimeHandlers: (handlers: {
      onSubmit?: (text: string) => void;
      onSyncValue?: (val: string) => void;
    }) => {
      submitHandler = handlers.onSubmit || null;
      valueSyncHandler = handlers.onSyncValue || null;
    },
    // Runtime -> React methods
    setBot: (name: string, roleId?: string, isCustomBot?: boolean) => {
      const next = (name && String(name).trim()) || "Momo";
      const nextRole =
        typeof roleId === "string" && roleId.trim()
          ? roleId.trim()
          : snap.roleId;
      const nextCustom =
        typeof isCustomBot === "boolean" ? isCustomBot : snap.isCustomBot;
      if (
        next === snap.botName &&
        nextRole === snap.roleId &&
        nextCustom === snap.isCustomBot
      ) {
        return;
      }
      patch({
        botName: next,
        roleId: nextRole,
        isCustomBot: nextCustom,
        placeholder: `Tanya ${next} apa saja`,
      });
    },
    setRoleColors: (palette: RolePaletteTuple) => {
      if (!Array.isArray(palette) || palette.length < 4) return;
      const same =
        snap.rolePalette[0] === palette[0] &&
        snap.rolePalette[1] === palette[1] &&
        snap.rolePalette[2] === palette[2] &&
        snap.rolePalette[3] === palette[3];
      if (!same) patch({ rolePalette: palette });
    },
    setBusy: (busy: boolean) => {
      const flag = !!busy;
      if (flag !== snap.busy) patch({ busy: flag });
    },
    setDictating: (dictating: boolean) => {
      const flag = !!dictating;
      if (flag !== snap.dictating) patch({ dictating: flag });
    },
    notifyInputChanged: (nextVal?: string) => {
      if (typeof nextVal === "string" && nextVal !== snap.inputValue) {
        patch({ inputValue: nextVal });
      }
    },
    notifySent: () => {
      patch({ sentSeq: snap.sentSeq + 1, inputValue: "", dictating: false });
    },
    // React -> Runtime actions
    pushInputFromReact: (val: string) => {
      if (val !== snap.inputValue) patch({ inputValue: val });
      valueSyncHandler?.(val);
    },
    submitFromReact: (text: string) => {
      submitHandler?.(text);
    },
  };
}

export type ComposerBridge = ReturnType<typeof createComposerBridge>;
