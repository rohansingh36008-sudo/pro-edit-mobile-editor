import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

type ViewName = 'home' | 'projects' | 'settings';
type EditMode = 'photo' | 'video';
type Project = {
  id: string;
  title: string;
  type: EditMode;
  date: string;
  meta: string;
  image: number;
  uri?: string;
};

const samplePortrait = require('../../assets/images/sample-portrait.jpg');
const sampleRoad = require('../../assets/images/sample-road.jpg');
const sampleFabric = require('../../assets/images/sample-fabric.jpg');
const projectStorageKey = '@pro-edit/projects';

const seedProjects: Project[] = [
  { id: 'portrait', title: 'City Portrait', type: 'photo', date: 'Today, 10:24 AM', meta: '1080 × 1350 · Edited', image: samplePortrait },
  { id: 'road', title: 'Blue Hour Drive', type: 'video', date: 'Yesterday', meta: '00:18 · 1080p', image: sampleRoad },
  { id: 'fabric', title: 'Motion Study', type: 'photo', date: 'Aug 28, 2026', meta: '2160 × 2160 · Edited', image: sampleFabric },
];

const adjustmentLabels = [
  { key: 'brightness', label: 'Brightness', icon: 'sun' as const },
  { key: 'contrast', label: 'Contrast', icon: 'sliders' as const },
  { key: 'saturation', label: 'Saturation', icon: 'droplet' as const },
  { key: 'exposure', label: 'Exposure', icon: 'sunrise' as const },
  { key: 'sharpness', label: 'Sharpness', icon: 'activity' as const },
  { key: 'blur', label: 'Blur', icon: 'wind' as const },
];

const filterOptions = [
  { name: 'Original', color: '#817A76' },
  { name: 'Cobalt', color: '#668DB2' },
  { name: 'Amber', color: '#D28B53' },
  { name: 'Noir', color: '#393940' },
  { name: 'Sienna', color: '#99634B' },
];

function AppIcon({ name, size = 20, color = '#FFFFFF' }: { name: React.ComponentProps<typeof Feather>['name']; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}

export default function ProEditHome() {
  const insets = useSafeAreaInsets();
  const [activeView, setActiveView] = useState<ViewName>('home');
  const [isDark, setIsDark] = useState(true);
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditMode>('photo');
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [selectedAdjustment, setSelectedAdjustment] = useState('brightness');
  const [adjustments, setAdjustments] = useState<Record<string, number>>({
    brightness: 18, contrast: 8, saturation: 12, exposure: 0, sharpness: 10, blur: 0,
  });
  const [history, setHistory] = useState<Record<string, number>[]>([]);
  const [future, setFuture] = useState<Record<string, number>[]>([]);
  const [activeFilter, setActiveFilter] = useState('Original');
  const [beforeAfter, setBeforeAfter] = useState(false);
  const [resolution, setResolution] = useState('1080p');
  const [rotation, setRotation] = useState(0);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const [speed, setSpeed] = useState(1);

  const theme = isDark ? colors.dark : colors.light;
  const currentAdjustment = adjustments[selectedAdjustment] ?? 0;
  const previewUri = selectedAsset?.uri;
  const previewImage = previewUri ? { uri: previewUri } : samplePortrait;
  const editorTitle = editorMode === 'photo' ? 'Photo editor' : 'Video editor';
  const projectCountLabel = `${projects.length} project${projects.length === 1 ? '' : 's'}`;

  useEffect(() => {
    AsyncStorage.getItem(projectStorageKey).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Project[];
          if (Array.isArray(parsed) && parsed.length > 0) setProjects(parsed);
        } catch {
          // Keep the beautiful starter state if an old value cannot be parsed.
        }
      }
    });
  }, []);

  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2400);
  };

  const persistProjects = async (next: Project[]) => {
    setProjects(next);
    await AsyncStorage.setItem(projectStorageKey, JSON.stringify(next));
  };

  const pulse = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const pickMedia = async (mode: EditMode) => {
    await pulse();
    setShowImportMenu(false);
    setIsImporting(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mode === 'photo' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });
    setIsImporting(false);
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setEditorMode(mode);
    setSelectedAsset(asset);
    setActiveView('home');
    setEditorOpen(true);
    const newProject: Project = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: mode === 'photo' ? 'Untitled photo' : 'Untitled video',
      type: mode,
      date: 'Just now',
      meta: mode === 'photo' ? 'Ready to edit' : 'Ready to edit · 1080p',
      image: mode === 'photo' ? samplePortrait : sampleRoad,
      uri: asset.uri,
    };
    await persistProjects([newProject, ...projects]);
    notify(`${mode === 'photo' ? 'Photo' : 'Video'} imported`);
  };

  const updateAdjustment = (value: number) => {
    setHistory((old) => [...old.slice(-19), adjustments]);
    setFuture([]);
    setAdjustments((old) => ({ ...old, [selectedAdjustment]: value }));
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setFuture((old) => [adjustments, ...old]);
    setAdjustments(previous);
    setHistory((old) => old.slice(0, -1));
    notify('Last change undone');
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory((old) => [...old, adjustments]);
    setAdjustments(next);
    setFuture((old) => old.slice(1));
    notify('Change restored');
  };

  const saveToGallery = async () => {
    if (!selectedAsset?.uri) {
      notify('Import a photo or video first');
      return;
    }
    await pulse();
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Gallery permission needed', 'Allow Pro Edit to save your finished work to the device gallery.');
      return;
    }
    await MediaLibrary.saveToLibraryAsync(selectedAsset.uri);
    notify('Saved to your gallery');
  };

  const openEditorForProject = (project: Project) => {
    setEditorMode(project.type);
    setSelectedAsset(project.uri ? { uri: project.uri, assetId: null, width: 1, height: 1, type: project.type === 'photo' ? 'image' : 'video', fileName: project.title } : null);
    setEditorOpen(true);
  };

  const previewTransform = beforeAfter ? [] : [{ rotate: `${rotation}deg` }];

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <View>
        <Text style={[styles.eyebrow, { color: theme.mutedForeground }]}>WEDNESDAY, SEPTEMBER 02</Text>
        <Text style={[styles.wordmark, { color: theme.foreground }]}>Pro <Text style={{ color: theme.primary }}>Edit</Text></Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable testID="theme-toggle" onPress={() => { setIsDark((old) => !old); pulse(); }} style={[styles.iconButton, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <AppIcon name={isDark ? 'sun' : 'moon'} color={theme.foreground} size={18} />
        </Pressable>
        <Pressable testID="profile-button" onPress={() => { setActiveView('settings'); pulse(); }} style={[styles.avatar, { backgroundColor: theme.accent }]}>
          <Text style={[styles.avatarText, { color: theme.accentForeground }]}>RS</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderHome = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}>
      <Text style={[styles.greeting, { color: theme.foreground }]}>Make something{"\n"}<Text style={{ color: theme.primary }}>worth keeping.</Text></Text>
      <Text style={[styles.subheading, { color: theme.mutedForeground }]}>Turn moments into stories with tools that stay out of your way.</Text>

      <LinearGradient colors={[theme.primary, '#E44D5C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
        <View style={styles.heroDecorOne} />
        <View style={styles.heroDecorTwo} />
        <View style={styles.heroTopLine}>
          <View style={styles.pill}>
            <AppIcon name="zap" size={12} color={theme.primary} />
            <Text style={styles.pillText}>PRO WORKSPACE</Text>
          </View>
          <AppIcon name="arrow-up-right" size={22} color="#FFFFFF" />
        </View>
        <Text style={styles.heroTitle}>Your next{'\n'}masterpiece starts here.</Text>
        <Text style={styles.heroDescription}>Edit photos and videos with clarity, speed, and a little magic.</Text>
        <Pressable testID="new-project-button" onPress={() => { setShowImportMenu((old) => !old); pulse(); }} style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}>
          <AppIcon name="plus" size={18} color={theme.primary} />
          <Text style={[styles.heroButtonText, { color: theme.primary }]}>New project</Text>
        </Pressable>
      </LinearGradient>

      {showImportMenu && (
        <View style={[styles.importMenu, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable testID="import-photo-button" onPress={() => pickMedia('photo')} style={styles.importChoice}>
            <View style={[styles.importIcon, { backgroundColor: '#FFE5DF' }]}><AppIcon name="image" color={theme.primary} size={18} /></View>
            <View style={styles.importCopy}><Text style={[styles.importTitle, { color: theme.foreground }]}>Edit a photo</Text><Text style={[styles.importMeta, { color: theme.mutedForeground }]}>From your gallery</Text></View>
            <AppIcon name="chevron-right" size={18} color={theme.mutedForeground} />
          </Pressable>
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <Pressable testID="import-video-button" onPress={() => pickMedia('video')} style={styles.importChoice}>
            <View style={[styles.importIcon, { backgroundColor: '#E3ECFE' }]}><AppIcon name="film" color="#5079B8" size={18} /></View>
            <View style={styles.importCopy}><Text style={[styles.importTitle, { color: theme.foreground }]}>Edit a video</Text><Text style={[styles.importMeta, { color: theme.mutedForeground }]}>Trim, tune & add sound</Text></View>
            <AppIcon name="chevron-right" size={18} color={theme.mutedForeground} />
          </Pressable>
        </View>
      )}

      <View style={styles.sectionHeading}>
        <View><Text style={[styles.sectionTitle, { color: theme.foreground }]}>Recent projects</Text><Text style={[styles.sectionMeta, { color: theme.mutedForeground }]}>{projectCountLabel}</Text></View>
        <Pressable testID="see-all-projects" onPress={() => { setActiveView('projects'); pulse(); }}><Text style={[styles.seeAll, { color: theme.primary }]}>See all</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectRow}>
        {projects.slice(0, 3).map((project) => (
          <Pressable testID={`project-${project.id}`} key={project.id} onPress={() => { openEditorForProject(project); pulse(); }} style={({ pressed }) => [styles.projectCard, { backgroundColor: theme.card, borderColor: theme.border }, pressed && styles.pressed]}>
            <Image source={project.uri ? { uri: project.uri } : project.image} style={styles.projectImage} />
            <View style={styles.projectImageShade} />
            <View style={styles.projectType}><AppIcon name={project.type === 'photo' ? 'image' : 'film'} color="#FFFFFF" size={12} /></View>
            <View style={styles.projectInfo}><Text numberOfLines={1} style={styles.projectName}>{project.title}</Text><Text style={styles.projectMeta}>{project.meta}</Text></View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.sectionHeading}><View><Text style={[styles.sectionTitle, { color: theme.foreground }]}>Quick tools</Text><Text style={[styles.sectionMeta, { color: theme.mutedForeground }]}>Jump right into the edit</Text></View></View>
      <View style={styles.toolGrid}>
        {[
          { icon: 'crop' as const, label: 'Crop & resize', sub: 'Photo' },
          { icon: 'scissors' as const, label: 'Trim & split', sub: 'Video' },
          { icon: 'type' as const, label: 'Text & stickers', sub: 'Both' },
          { icon: 'layers' as const, label: 'Filters & FX', sub: 'Both' },
        ].map((tool) => (
          <Pressable key={tool.label} onPress={() => { setEditorMode(tool.sub === 'Video' ? 'video' : 'photo'); setEditorOpen(true); pulse(); }} style={({ pressed }) => [styles.toolCard, { backgroundColor: theme.card, borderColor: theme.border }, pressed && styles.pressed]}>
            <View style={[styles.toolIcon, { backgroundColor: theme.secondary }]}><AppIcon name={tool.icon} color={theme.primary} size={18} /></View>
            <Text style={[styles.toolName, { color: theme.foreground }]}>{tool.label}</Text><Text style={[styles.toolSub, { color: theme.mutedForeground }]}>{tool.sub}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );

  const renderProjects = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}>
      <View style={styles.pageTitleRow}><View><Text style={[styles.pageTitle, { color: theme.foreground }]}>My projects</Text><Text style={[styles.subheading, { color: theme.mutedForeground }]}>Everything you are making, in one place.</Text></View><Pressable onPress={() => setShowImportMenu((old) => !old)} style={[styles.roundedAction, { backgroundColor: theme.primary }]}><AppIcon name="plus" size={18} color="#FFFFFF" /></Pressable></View>
      {projects.map((project) => (
        <Pressable testID={`project-list-${project.id}`} key={project.id} onPress={() => openEditorForProject(project)} style={({ pressed }) => [styles.listProject, { backgroundColor: theme.card, borderColor: theme.border }, pressed && styles.pressed]}>
          <Image source={project.uri ? { uri: project.uri } : project.image} style={styles.listImage} />
          <View style={styles.listCopy}><Text style={[styles.listTitle, { color: theme.foreground }]}>{project.title}</Text><Text style={[styles.listMeta, { color: theme.mutedForeground }]}>{project.date}</Text><View style={styles.listTag}><AppIcon name={project.type === 'photo' ? 'image' : 'film'} color={theme.primary} size={11} /><Text style={[styles.listTagText, { color: theme.primary }]}>{project.meta}</Text></View></View>
          <AppIcon name="chevron-right" size={18} color={theme.mutedForeground} />
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderSettings = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}>
      <Text style={[styles.pageTitle, { color: theme.foreground }]}>Preferences</Text><Text style={[styles.subheading, { color: theme.mutedForeground }]}>Make Pro Edit feel like yours.</Text>
      <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={[styles.largeAvatar, { backgroundColor: theme.accent }]}><Text style={[styles.largeAvatarText, { color: theme.accentForeground }]}>RS</Text></View><View><Text style={[styles.profileName, { color: theme.foreground }]}>Rohan Singh</Text><Text style={[styles.profileMeta, { color: theme.mutedForeground }]}>Creator workspace</Text></View><AppIcon name="edit-2" size={17} color={theme.mutedForeground} /></View>
      <Text style={[styles.settingsLabel, { color: theme.mutedForeground }]}>APPEARANCE</Text>
      <View style={[styles.settingRow, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={styles.settingLeading}><View style={[styles.settingIcon, { backgroundColor: theme.secondary }]}><AppIcon name={isDark ? 'moon' : 'sun'} color={theme.primary} size={17} /></View><View><Text style={[styles.settingTitle, { color: theme.foreground }]}>Dark mode</Text><Text style={[styles.settingMeta, { color: theme.mutedForeground }]}>{isDark ? 'Easy on the eyes' : 'Bright and clear'}</Text></View></View><Pressable testID="settings-theme-toggle" onPress={() => setIsDark((old) => !old)} style={[styles.switchTrack, { backgroundColor: isDark ? theme.primary : theme.muted }]}><View style={[styles.switchKnob, isDark && styles.switchKnobActive]} /></Pressable></View>
      <Text style={[styles.settingsLabel, { color: theme.mutedForeground }]}>WORKSPACE</Text>
      {[
        { icon: 'download' as const, title: 'Export quality', meta: '1080p HD by default' },
        { icon: 'shield' as const, title: 'Privacy', meta: 'Projects stay on your device' },
        { icon: 'help-circle' as const, title: 'Help & feedback', meta: 'We would love to hear from you' },
      ].map((item) => <Pressable key={item.title} style={[styles.settingRow, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={styles.settingLeading}><View style={[styles.settingIcon, { backgroundColor: theme.secondary }]}><AppIcon name={item.icon} color={theme.primary} size={17} /></View><View><Text style={[styles.settingTitle, { color: theme.foreground }]}>{item.title}</Text><Text style={[styles.settingMeta, { color: theme.mutedForeground }]}>{item.meta}</Text></View></View><AppIcon name="chevron-right" size={18} color={theme.mutedForeground} /></Pressable>)}
      <Text style={[styles.version, { color: theme.mutedForeground }]}>PRO EDIT · VERSION 1.0</Text>
    </ScrollView>
  );

  const renderEditor = () => (
    <View style={[styles.editorShell, { backgroundColor: theme.background }]}>
      <View style={[styles.editorHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="close-editor" onPress={() => setEditorOpen(false)} style={styles.editorIconButton}><AppIcon name="x" size={22} color={theme.foreground} /></Pressable>
        <View><Text style={[styles.editorEyebrow, { color: theme.mutedForeground }]}>{editorMode === 'photo' ? 'PHOTO PROJECT' : 'VIDEO PROJECT'}</Text><Text style={[styles.editorTitle, { color: theme.foreground }]}>{editorTitle}</Text></View>
        <View style={styles.editorHeaderActions}><Pressable testID="undo-button" onPress={undo} style={[styles.editorIconButton, !history.length && styles.disabled]}><AppIcon name="corner-up-left" size={19} color={theme.foreground} /></Pressable><Pressable testID="redo-button" onPress={redo} style={[styles.editorIconButton, !future.length && styles.disabled]}><AppIcon name="corner-up-right" size={19} color={theme.foreground} /></Pressable></View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editorContent}>
        <View style={styles.canvasWrap}>
          <Image source={previewImage} style={[styles.canvasImage, { opacity: beforeAfter ? 0.78 : 1, transform: previewTransform }]} />
          {activeFilter !== 'Original' && !beforeAfter && <View style={[styles.filterWash, { backgroundColor: filterOptions.find((item) => item.name === activeFilter)?.color ?? theme.primary }]} />}
          {backgroundRemoved && <View style={styles.backgroundRemovedOverlay}><AppIcon name="scissors" size={17} color="#FFFFFF" /><Text style={styles.backgroundRemovedText}>BACKGROUND REMOVED</Text></View>}
          {beforeAfter && <View style={styles.beforeBadge}><Text style={styles.beforeText}>BEFORE</Text></View>}
          {!previewUri && <View style={styles.previewHint}><AppIcon name={editorMode === 'photo' ? 'image' : 'film'} size={18} color="#FFFFFF" /><Text style={styles.previewHintText}>Sample preview · import your own media</Text></View>}
          <Pressable testID="before-after-button" onPress={() => { setBeforeAfter((old) => !old); pulse(); }} style={[styles.beforeAfterButton, { backgroundColor: theme.card }]}><AppIcon name="columns" size={15} color={theme.foreground} /><Text style={[styles.beforeAfterText, { color: theme.foreground }]}>{beforeAfter ? 'Current' : 'Before / after'}</Text></Pressable>
        </View>

        {editorMode === 'video' && <View style={[styles.timeline, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={styles.timelineHead}><Text style={[styles.timelineLabel, { color: theme.foreground }]}>00:04.2 — 00:18.0</Text><Text style={[styles.timelineLabel, { color: theme.primary }]}>1.0×</Text></View><View style={styles.timelineTrack}>{[0, 1, 2, 3, 4, 5, 6, 7].map((_, index) => <Image key={index} source={sampleRoad} style={[styles.timelineThumb, { opacity: 0.55 + (index % 2) * 0.2 }]} />)}<View style={[styles.playhead, { backgroundColor: theme.primary }]} /></View><View style={styles.timelineActions}><Pressable onPress={() => notify('Trim handles ready')}><AppIcon name="scissors" size={15} color={theme.primary} /><Text style={[styles.timelineActionText, { color: theme.foreground }]}>Trim</Text></Pressable><Pressable onPress={() => notify('Split at playhead')}><AppIcon name="git-commit" size={15} color={theme.primary} /><Text style={[styles.timelineActionText, { color: theme.foreground }]}>Split</Text></Pressable><Pressable onPress={() => notify('Sound library opened')}><AppIcon name="music" size={15} color={theme.primary} /><Text style={[styles.timelineActionText, { color: theme.foreground }]}>Sound</Text></Pressable></View></View>}

        <View style={styles.editorSectionHead}><Text style={[styles.editorSectionTitle, { color: theme.foreground }]}>Adjust</Text><Text style={[styles.editorValue, { color: theme.primary }]}>{adjustmentLabels.find((item) => item.key === selectedAdjustment)?.label} {currentAdjustment > 0 ? '+' : ''}{currentAdjustment}</Text></View>
        <View style={styles.adjustmentGrid}>{adjustmentLabels.map((adjustment) => <Pressable key={adjustment.key} onPress={() => setSelectedAdjustment(adjustment.key)} style={[styles.adjustmentChip, { backgroundColor: selectedAdjustment === adjustment.key ? theme.primary : theme.card, borderColor: selectedAdjustment === adjustment.key ? theme.primary : theme.border }]}><AppIcon name={adjustment.icon} size={15} color={selectedAdjustment === adjustment.key ? '#FFFFFF' : theme.mutedForeground} /><Text style={[styles.adjustmentText, { color: selectedAdjustment === adjustment.key ? '#FFFFFF' : theme.mutedForeground }]}>{adjustment.label}</Text></Pressable>)}</View>
        <View style={[styles.sliderTrack, { backgroundColor: theme.muted }]}><View style={[styles.sliderFill, { backgroundColor: theme.primary, width: `${Math.min(100, Math.max(4, currentAdjustment + 50))}%` }]} /><View style={[styles.sliderKnob, { backgroundColor: theme.primary, left: `${Math.min(96, Math.max(4, currentAdjustment + 50))}%` }]} /><Pressable testID="adjustment-slider" onPress={(event) => updateAdjustment(Math.round((event.nativeEvent.locationX / 280) * 100 - 50))} style={StyleSheet.absoluteFill} /></View>

        <View style={styles.editorSectionHead}><Text style={[styles.editorSectionTitle, { color: theme.foreground }]}>Filters</Text><Pressable onPress={() => setActiveFilter('Original')}><Text style={[styles.resetText, { color: theme.primary }]}>Reset</Text></Pressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{filterOptions.map((filter) => <Pressable key={filter.name} onPress={() => { setActiveFilter(filter.name); pulse(); }} style={styles.filterItem}><View style={[styles.filterPreview, { backgroundColor: filter.color, borderWidth: activeFilter === filter.name ? 2 : 0, borderColor: theme.primary }]}><Image source={previewImage} style={styles.filterPreviewImage} /></View><Text style={[styles.filterName, { color: activeFilter === filter.name ? theme.foreground : theme.mutedForeground }]}>{filter.name}</Text></Pressable>)}</ScrollView>

        <View style={styles.editorSectionHead}><Text style={[styles.editorSectionTitle, { color: theme.foreground }]}>Edit tools</Text></View>
        <View style={styles.addTools}>{[{ icon: 'crop' as const, label: 'Crop' }, { icon: 'maximize' as const, label: 'Resize' }, { icon: 'rotate-cw' as const, label: 'Rotate' }, { icon: 'scissors' as const, label: 'Remove BG' }].map((item) => <Pressable key={item.label} onPress={() => { if (item.label === 'Rotate') setRotation((old) => (old + 90) % 360); if (item.label === 'Remove BG') setBackgroundRemoved((old) => !old); if (item.label === 'Crop') notify('Crop frame ready'); if (item.label === 'Resize') notify('Resize presets ready'); pulse(); }} style={[styles.addTool, { backgroundColor: theme.card, borderColor: theme.border }]}><AppIcon name={item.icon} size={18} color={theme.primary} /><Text style={[styles.addToolText, { color: theme.foreground }]}>{item.label}</Text></Pressable>)}</View>
        <View style={styles.editorSectionHead}><Text style={[styles.editorSectionTitle, { color: theme.foreground }]}>Add to your story</Text></View>
        <View style={styles.addTools}>{[{ icon: 'type' as const, label: 'Text' }, { icon: 'smile' as const, label: 'Sticker' }, { icon: 'layers' as const, label: 'Effects' }, { icon: 'music' as const, label: 'Music' }].map((item) => <Pressable key={item.label} onPress={() => notify(`${item.label} tool ready`)} style={[styles.addTool, { backgroundColor: theme.card, borderColor: theme.border }]}><AppIcon name={item.icon} size={18} color={theme.primary} /><Text style={[styles.addToolText, { color: theme.foreground }]}>{item.label}</Text></Pressable>)}</View>
        {editorMode === 'video' && <><View style={styles.editorSectionHead}><Text style={[styles.editorSectionTitle, { color: theme.foreground }]}>Playback speed</Text><Text style={[styles.editorValue, { color: theme.primary }]}>{speed.toFixed(1)}×</Text></View><View style={styles.speedRow}>{[0.5, 1, 1.5, 2].map((value) => <Pressable key={value} onPress={() => setSpeed(value)} style={[styles.speedButton, { backgroundColor: speed === value ? theme.primary : theme.card, borderColor: speed === value ? theme.primary : theme.border }]}><Text style={[styles.speedText, { color: speed === value ? '#FFFFFF' : theme.mutedForeground }]}>{value}×</Text></Pressable>)}</View></>}
        {editorMode === 'video' && <><View style={styles.editorSectionHead}><Text style={[styles.editorSectionTitle, { color: theme.foreground }]}>Export quality</Text></View><View style={styles.resolutionRow}>{['720p', '1080p', '4K'].map((value) => <Pressable key={value} onPress={() => setResolution(value)} style={[styles.resolutionButton, { backgroundColor: resolution === value ? theme.primary : theme.card, borderColor: resolution === value ? theme.primary : theme.border }]}><Text style={[styles.resolutionText, { color: resolution === value ? '#FFFFFF' : theme.mutedForeground }]}>{value}</Text></Pressable>)}</View></>}
        <Pressable testID="save-export-button" onPress={saveToGallery} style={({ pressed }) => [styles.exportButton, { backgroundColor: theme.primary }, pressed && styles.pressed]}><AppIcon name="download" size={18} color="#FFFFFF" /><Text style={styles.exportText}>Save to gallery</Text><AppIcon name="arrow-up-right" size={18} color="#FFFFFF" /></Pressable>
        <Text style={[styles.exportHint, { color: theme.mutedForeground }]}>{editorMode === 'photo' ? 'HD export · JPG · original resolution' : `${resolution} export · MP4 · ready to share`}</Text>
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {header}
      {activeView === 'home' && renderHome()}
      {activeView === 'projects' && renderProjects()}
      {activeView === 'settings' && renderSettings()}
      <View style={[styles.bottomNav, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        {([{ name: 'home' as ViewName, icon: 'home' as const, label: 'Home' }, { name: 'projects' as ViewName, icon: 'grid' as const, label: 'Projects' }, { name: 'settings' as ViewName, icon: 'settings' as const, label: 'Settings' }]).map((item) => <Pressable testID={`nav-${item.name}`} key={item.name} onPress={() => { setActiveView(item.name); pulse(); }} style={styles.navItem}><AppIcon name={item.icon} size={20} color={activeView === item.name ? theme.primary : theme.mutedForeground} /><Text style={[styles.navLabel, { color: activeView === item.name ? theme.primary : theme.mutedForeground }]}>{item.label}</Text>{activeView === item.name && <View style={[styles.navDot, { backgroundColor: theme.primary }]} />}</Pressable>)}
        <Pressable testID="nav-create" onPress={() => { setShowImportMenu(true); setActiveView('home'); pulse(); }} style={[styles.createNav, { backgroundColor: theme.primary }]}><AppIcon name="plus" size={22} color="#FFFFFF" /></Pressable>
      </View>
      {isImporting && <View style={styles.loadingOverlay}><ActivityIndicator color="#FFFFFF" /><Text style={styles.loadingText}>Opening your gallery…</Text></View>}
      {!!toast && <View style={[styles.toast, { backgroundColor: theme.foreground }]}><AppIcon name="check-circle" size={16} color={theme.primary} /><Text style={[styles.toastText, { color: theme.background }]}>{toast}</Text></View>}
      {editorOpen && renderEditor()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 22, paddingBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.4, marginBottom: 5 },
  wordmark: { fontSize: 25, fontFamily: 'Inter_700Bold', letterSpacing: -1.1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  scrollContent: { paddingHorizontal: 22 },
  greeting: { fontFamily: 'Inter_700Bold', fontSize: 35, lineHeight: 38, letterSpacing: -1.5, marginTop: 4 },
  subheading: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 320 },
  heroCard: { borderRadius: 24, padding: 20, marginTop: 24, minHeight: 246, overflow: 'hidden' },
  heroDecorOne: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -70, top: -60, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroDecorTwo: { position: 'absolute', width: 130, height: 130, borderRadius: 65, right: 28, bottom: -76, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  heroTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  heroTitle: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 27, lineHeight: 29, letterSpacing: -0.8, marginTop: 22 },
  heroDescription: { color: 'rgba(255,255,255,0.78)', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, marginTop: 10, maxWidth: 250 },
  heroButton: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 15, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  heroButtonText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  importMenu: { marginTop: 10, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 4 },
  importChoice: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  importIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  importCopy: { flex: 1, marginLeft: 11 },
  importTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  importMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  menuDivider: { height: 1, marginLeft: 49 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 28, marginBottom: 13 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.4 },
  sectionMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  seeAll: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 2 },
  projectRow: { gap: 12, paddingRight: 22 },
  projectCard: { width: 170, height: 210, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  projectImage: { width: '100%', height: '100%' },
  projectImageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 10, 15, 0.22)' },
  projectType: { position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  projectInfo: { position: 'absolute', bottom: 14, left: 14, right: 10 },
  projectName: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 14 },
  projectMeta: { color: 'rgba(255,255,255,0.76)', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toolCard: { width: '48%', minHeight: 105, borderRadius: 17, borderWidth: 1, padding: 13 },
  toolIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toolName: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 10 },
  toolSub: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  bottomNav: { position: 'absolute', left: 14, right: 14, bottom: 10, minHeight: 68, borderRadius: 24, borderWidth: 1, paddingTop: 9, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', shadowColor: '#000000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  navItem: { minWidth: 58, alignItems: 'center', justifyContent: 'center', gap: 4 },
  navLabel: { fontFamily: 'Inter_500Medium', fontSize: 9 },
  navDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  createNav: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginHorizontal: 3 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.28 },
  pageTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 24 },
  pageTitle: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -1.1 },
  roundedAction: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  listProject: { flexDirection: 'row', alignItems: 'center', borderRadius: 19, borderWidth: 1, padding: 10, marginBottom: 11 },
  listImage: { width: 64, height: 72, borderRadius: 13 },
  listCopy: { flex: 1, marginLeft: 12 },
  listTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  listMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  listTag: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 },
  listTagText: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  profileCard: { borderRadius: 20, borderWidth: 1, padding: 15, flexDirection: 'row', alignItems: 'center', marginTop: 26, marginBottom: 26 },
  largeAvatar: { width: 49, height: 49, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  largeAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  profileName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  profileMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  settingsLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, marginBottom: 9, marginTop: 2 },
  settingRow: { minHeight: 70, borderRadius: 17, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  settingLeading: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  settingTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  settingMeta: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
  switchTrack: { width: 45, height: 27, borderRadius: 15, padding: 3, justifyContent: 'center' },
  switchKnob: { width: 21, height: 21, borderRadius: 11, backgroundColor: '#FFFFFF', alignSelf: 'flex-start' },
  switchKnobActive: { alignSelf: 'flex-end' },
  version: { alignSelf: 'center', fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1.1, marginTop: 26 },
  editorShell: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  editorHeader: { paddingHorizontal: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  editorIconButton: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center' },
  editorHeaderActions: { marginLeft: 'auto', flexDirection: 'row', gap: 2 },
  editorEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.3 },
  editorTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 2 },
  editorContent: { paddingHorizontal: 18, paddingBottom: 40 },
  canvasWrap: { height: 300, borderRadius: 24, overflow: 'hidden', backgroundColor: '#28252B', position: 'relative' },
  canvasImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  filterWash: { ...StyleSheet.absoluteFillObject, opacity: 0.14 },
  backgroundRemovedOverlay: { position: 'absolute', top: 15, right: 15, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,107,87,0.9)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  backgroundRemovedText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.8 },
  beforeBadge: { position: 'absolute', top: 15, left: 15, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.6)' },
  beforeText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  previewHint: { position: 'absolute', top: 15, right: 15, flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewHintText: { color: 'rgba(255,255,255,0.78)', fontFamily: 'Inter_500Medium', fontSize: 9 },
  beforeAfterButton: { position: 'absolute', bottom: 13, left: 13, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  beforeAfterText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  timeline: { borderRadius: 18, borderWidth: 1, padding: 12, marginTop: 12 },
  timelineHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  timelineLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  timelineTrack: { flexDirection: 'row', height: 43, overflow: 'hidden', borderRadius: 8, position: 'relative' },
  timelineThumb: { flex: 1, height: 43, marginRight: 1 },
  playhead: { position: 'absolute', top: 0, bottom: 0, left: '34%', width: 2 },
  timelineActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  timelineActionText: { fontFamily: 'Inter_500Medium', fontSize: 10, marginLeft: 5 },
  editorSectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12 },
  editorSectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: -0.3 },
  editorValue: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  adjustmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  adjustmentChip: { borderRadius: 12, borderWidth: 1, paddingVertical: 9, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  adjustmentText: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  sliderTrack: { height: 5, borderRadius: 3, marginTop: 21, position: 'relative' },
  sliderFill: { height: 5, borderRadius: 3 },
  sliderKnob: { position: 'absolute', top: -5, marginLeft: -8, width: 15, height: 15, borderRadius: 8, borderWidth: 3, borderColor: '#FFFFFF' },
  filterRow: { gap: 12, paddingRight: 18 },
  filterItem: { alignItems: 'center' },
  filterPreview: { width: 67, height: 67, borderRadius: 15, overflow: 'hidden', padding: 2 },
  filterPreviewImage: { width: '100%', height: '100%', borderRadius: 12, opacity: 0.82 },
  filterName: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 7 },
  resetText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  addTools: { flexDirection: 'row', gap: 8 },
  addTool: { flex: 1, minHeight: 66, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 7 },
  addToolText: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  speedRow: { flexDirection: 'row', gap: 8 },
  speedButton: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 11, alignItems: 'center' },
  speedText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  resolutionRow: { flexDirection: 'row', gap: 8 },
  resolutionButton: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 11, alignItems: 'center' },
  resolutionText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  exportButton: { minHeight: 53, borderRadius: 17, marginTop: 26, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 10 },
  exportText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 14, flex: 1 },
  exportHint: { fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center', marginTop: 9 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,15,18,0.88)', zIndex: 30, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#FFFFFF', fontFamily: 'Inter_500Medium', fontSize: 13 },
  toast: { position: 'absolute', bottom: 95, left: 28, right: 28, minHeight: 45, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9, zIndex: 40 },
  toastText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, flex: 1 },
});
