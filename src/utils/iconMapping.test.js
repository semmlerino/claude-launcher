import { describe, it, expect, vi } from 'vitest';
import { 
  getIconComponent, 
  isValidIcon, 
  isCustomIcon, 
  getCustomIconFilename, 
  getCustomIconPath,
  ICON_MAP, 
} from './iconMapping';
import { Folder } from '@mui/icons-material';

describe('iconMapping', () => {
  describe('getIconComponent', () => {
    it('returns the correct icon component for valid icon names', () => {
      const CodeIcon = getIconComponent('Code');
      const TerminalIcon = getIconComponent('Terminal');
      
      expect(CodeIcon).toBeDefined();
      expect(TerminalIcon).toBeDefined();
      expect(CodeIcon).toBe(ICON_MAP.Code);
      expect(TerminalIcon).toBe(ICON_MAP.Terminal);
    });

    it('returns CUSTOM_ICON marker for custom icon paths', () => {
      const customIcon = getIconComponent('custom://my-icon.svg');
      expect(customIcon).toBe('CUSTOM_ICON');
    });

    it('returns Folder component for invalid icon names', () => {
      const invalidIcon = getIconComponent('NonExistentIcon');
      expect(invalidIcon).toBe(Folder);
    });

    it('returns Folder component for null/undefined input', () => {
      expect(getIconComponent(null)).toBe(Folder);
      expect(getIconComponent(undefined)).toBe(Folder);
      expect(getIconComponent('')).toBe(Folder);
    });

    it('returns Folder component for non-string input', () => {
      expect(getIconComponent(123)).toBe(Folder);
      expect(getIconComponent({})).toBe(Folder);
      expect(getIconComponent([])).toBe(Folder);
    });
  });

  describe('isValidIcon', () => {
    it('returns true for valid icon names', () => {
      expect(isValidIcon('Code')).toBe(true);
      expect(isValidIcon('Terminal')).toBe(true);
      expect(isValidIcon('Web')).toBe(true);
      expect(isValidIcon('Build')).toBe(true);
    });

    it('returns true for custom icon paths', () => {
      expect(isValidIcon('custom://my-icon.svg')).toBe(true);
      expect(isValidIcon('custom://logo.png')).toBe(true);
    });

    it('returns false for invalid icon names', () => {
      expect(isValidIcon('NonExistentIcon')).toBe(false);
      expect(isValidIcon('')).toBe(false);
      expect(isValidIcon(null)).toBe(false);
      expect(isValidIcon(undefined)).toBe(false);
    });

    it('returns false for non-string input', () => {
      expect(isValidIcon(123)).toBe(false);
      expect(isValidIcon({})).toBe(false);
      expect(isValidIcon([])).toBe(false);
    });
  });

  describe('isCustomIcon', () => {
    it('returns true for custom icon paths', () => {
      expect(isCustomIcon('custom://my-icon.svg')).toBe(true);
      expect(isCustomIcon('custom://logo.png')).toBe(true);
      expect(isCustomIcon('custom://test.jpg')).toBe(true);
    });

    it('returns false for predefined icon names', () => {
      expect(isCustomIcon('Code')).toBe(false);
      expect(isCustomIcon('Terminal')).toBe(false);
      expect(isCustomIcon('Web')).toBe(false);
    });

    it('returns false for invalid input', () => {
      expect(isCustomIcon('')).toBe(false);
      expect(isCustomIcon(null)).toBe(false);
      expect(isCustomIcon(undefined)).toBe(false);
      expect(isCustomIcon(123)).toBe(false);
      expect(isCustomIcon('invalid-path')).toBe(false);
    });
  });

  describe('getCustomIconFilename', () => {
    it('extracts filename from custom icon paths', () => {
      expect(getCustomIconFilename('custom://my-icon.svg')).toBe('my-icon.svg');
      expect(getCustomIconFilename('custom://logo.png')).toBe('logo.png');
      expect(getCustomIconFilename('custom://test-file.jpg')).toBe('test-file.jpg');
    });

    it('returns null for non-custom icon paths', () => {
      expect(getCustomIconFilename('Code')).toBe(null);
      expect(getCustomIconFilename('Terminal')).toBe(null);
      expect(getCustomIconFilename('')).toBe(null);
      expect(getCustomIconFilename(null)).toBe(null);
    });
  });

  describe('getCustomIconPath', () => {
    beforeEach(() => {
      // Mock the Tauri invoke function
      vi.clearAllMocks();
    });

    it('returns null for non-custom icons', async () => {
      const result = await getCustomIconPath('Code');
      expect(result).toBe(null);
    });

    it('returns null for invalid input', async () => {
      const result1 = await getCustomIconPath('');
      const result2 = await getCustomIconPath(null);
      expect(result1).toBe(null);
      expect(result2).toBe(null);
    });

    it('calls invoke for custom icons and returns path', async () => {
      // Mock dynamic import of @tauri-apps/api/core
      const mockInvoke = vi.fn().mockResolvedValue('/path/to/icon.svg');
      vi.doMock('@tauri-apps/api/core', () => ({
        invoke: mockInvoke,
      }));

      // Re-import the function to get the mocked version
      const { getCustomIconPath: mockedGetCustomIconPath } = await import('./iconMapping');
      
      const result = await mockedGetCustomIconPath('custom://my-icon.svg');
      
      expect(mockInvoke).toHaveBeenCalledWith('get_custom_icon_path', { iconId: 'my-icon.svg' });
      expect(result).toBe('/path/to/icon.svg');
    });

    it('handles invoke errors gracefully', async () => {
      // Mock dynamic import with failing invoke
      const mockInvoke = vi.fn().mockRejectedValue(new Error('Failed to get path'));
      vi.doMock('@tauri-apps/api/core', () => ({
        invoke: mockInvoke,
      }));

      const { getCustomIconPath: mockedGetCustomIconPath } = await import('./iconMapping');
      
      const result = await mockedGetCustomIconPath('custom://my-icon.svg');
      
      expect(result).toBe(null);
    });
  });

  describe('ICON_MAP', () => {
    it('contains expected development icons', () => {
      expect(ICON_MAP.Code).toBeDefined();
      expect(ICON_MAP.Terminal).toBeDefined();
      expect(ICON_MAP.Storage).toBeDefined();
      expect(ICON_MAP.Api).toBeDefined();
    });

    it('contains expected project type icons', () => {
      expect(ICON_MAP.Web).toBeDefined();
      expect(ICON_MAP.PhoneAndroid).toBeDefined();
      expect(ICON_MAP.Computer).toBeDefined();
      expect(ICON_MAP.SportsEsports).toBeDefined();
    });

    it('contains expected tool icons', () => {
      expect(ICON_MAP.Build).toBeDefined();
      expect(ICON_MAP.Settings).toBeDefined();
      expect(ICON_MAP.Engineering).toBeDefined();
      expect(ICON_MAP.Construction).toBeDefined();
    });

    it('contains expected general icons', () => {
      expect(ICON_MAP.Star).toBeDefined();
      expect(ICON_MAP.Favorite).toBeDefined();
      expect(ICON_MAP.Bolt).toBeDefined();
      expect(ICON_MAP.Rocket).toBeDefined();
    });

    it('contains expected business icons', () => {
      expect(ICON_MAP.Business).toBeDefined();
      expect(ICON_MAP.TrendingUp).toBeDefined();
      expect(ICON_MAP.Assessment).toBeDefined();
      expect(ICON_MAP.BarChart).toBeDefined();
    });

    it('contains the fallback Folder icon', () => {
      expect(ICON_MAP.Folder).toBeDefined();
    });
  });
});
