import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import { AudioProvider, useAudio } from './AudioProvider';

// --- Mocking import.meta.glob ---
// This is tricky because import.meta.glob is a compile-time feature.
// For testing, we effectively mock the modules it would load.
// We will assume AudioProvider.tsx correctly processes these if they were loaded.
// The key is that sfxMap in AudioProvider gets populated.
// To test this directly, AudioProvider might need to expose its sfxMap or make it injectable for tests,
// or we test components that use playSfx and verify their behavior.

// --- Mock HTMLAudioElement ---
const mockAudioInstance = {
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(),
  volume: 0.5,
  currentTime: 0,
  duration: 100, // Mock duration
  loop: false,
  // Add any other properties or methods your component/hook might interact with
};

describe('AudioProvider and useAudio hook', () => {
  beforeEach(() => {
    vi.stubGlobal('Audio', vi.fn(() => mockAudioInstance));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const TestConsumer: React.FC<{ sfxNameToPlay?: string; onRender?: (ctx: any) => void }> = ({ sfxNameToPlay, onRender }) => {
    const audioContext = useAudio();
    useEffect(() => {
      if (onRender) onRender(audioContext);
      if (sfxNameToPlay) {
        act(() => {
          audioContext.playSfx(sfxNameToPlay);
        });
      }
    }, [sfxNameToPlay, audioContext, onRender]);
    return null;
  };

  it('playSfx calls new Audio(url) and audio.play() if sound URL is found', () => {
    // To properly test this, sfxMap in AudioProvider needs to have 'test-start.mp3'
    // We are currently unable to directly mock the import.meta.glob that populates it from here.
    // So, this test assumes that if a URL is resolved, Audio and play are called.
    // We can simulate this by directly testing the playSfx function if we could get it,
    // or by relying on the internal sfxMap of a rendered provider.
    // For now, we will call playSfx through the hook and verify mocks.
    // This implicitly tests that AudioProvider populates sfxMap correctly for this to work.

    // Let's manually set an item in the sfxMap for AudioProvider to find.
    // This is a workaround due to difficulty mocking import.meta.glob from outside the module.
    // In a real scenario, ensure your build/dev server provides the files for globbing.
    
    // To make this testable, we would ideally mock the sfxMap population.
    // However, since it's module-level, we'll assume it works if files are present.
    // The test will focus on the Audio object interaction.

    render(
      <AudioProvider>
        <TestConsumer sfxNameToPlay="start.mp3" /> {/* Assuming 'start.mp3' is a valid key after globbing */}
      </AudioProvider>
    );

    // Check if Audio constructor was called via the stub
    expect(Audio).toHaveBeenCalled();
    // Check if play was called on the instance
    expect(mockAudioInstance.play).toHaveBeenCalled();
  });

  it('playSfx should console.warn if sound is not found', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn');
    consoleWarnSpy.mockImplementation(() => {}); // Suppress actual console output for the test

    render(
      <AudioProvider>
        <TestConsumer sfxNameToPlay="non-existent-sound.mp3" />
      </AudioProvider>
    );
    
    expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SFX "non-existent-sound.mp3" not found')
    );
    // Ensure play was not called if the sound is not found
    // If Audio constructor was called for a non-existent sound before the warning, that might be an issue to check.
    // Based on current AudioProvider logic, new Audio() is only called if URL is found.
    expect(mockAudioInstance.play).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

}); 