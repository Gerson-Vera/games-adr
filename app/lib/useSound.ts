"use client";

import { useCallback, useEffect, useRef } from "react";

type SoundName = "correct" | "wrong" | "tick" | "win" | "lose" | "click" | "countdown";

const SOUND_SRCS: Record<SoundName, string> = {
  correct:   "/sounds/correct.mp3",
  wrong:     "/sounds/wrong.mp3",
  tick:      "/sounds/tick.mp3",
  win:       "/sounds/winning.mp3",
  lose:      "/sounds/losing.mp3",
  click:     "/sounds/click.mp3",
  countdown: "/sounds/countdown.mp3",
};

const VOLUMES: Record<SoundName, number> = {
  correct:   0.6,
  wrong:     0.6,
  tick:      0.35,
  win:       0.8,
  lose:      0.6,
  click:     0.3,
  countdown: 0.5,
};

export function useSound() {
  const cache = useRef<Partial<Record<SoundName, any>>>({});

  // Precarga los sonidos críticos al montar
  useEffect(() => {
    import("howler").then(({ Howl }) => {
      (["correct", "wrong", "win", "lose"] as SoundName[]).forEach((name) => {
        if (!cache.current[name]) {
          cache.current[name] = new Howl({
            src: [SOUND_SRCS[name]],
            volume: VOLUMES[name],
            preload: true,
          });
        }
      });
    });
  }, []);

  const play = useCallback((name: SoundName) => {
    import("howler").then(({ Howl }) => {
      if (!cache.current[name]) {
        cache.current[name] = new Howl({
          src: [SOUND_SRCS[name]],
          volume: VOLUMES[name],
        });
      }
      cache.current[name].play();
    });
  }, []);

  const stop = useCallback((name: SoundName) => {
    cache.current[name]?.stop();
  }, []);

  return { play, stop };
}
