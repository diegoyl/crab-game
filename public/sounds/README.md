# Sound Files for Crab Game

This folder contains all the sound files for the crab game. Place your audio files here according to the structure below.

## File Structure

```
public/sounds/
├── README.md
├── shell-collection.mp3      # Sound when collecting shells
├── crab-flip.mp3            # Sound when crab flips over
├── crab-revival.mp3         # Sound when crab gets back up
├── yelling.mp3              # Sound when game ends and crab runs away
├── background-ambient.mp3   # Looping background ambient sound
├── drowning.mp3             # Looping sound when health is at 0
└── footsteps/
    ├── footstep-1.mp3       # Footstep sound 1 of 8
    ├── footstep-2.mp3       # Footstep sound 2 of 8
    ├── footstep-3.mp3       # Footstep sound 3 of 8
    ├── footstep-4.mp3       # Footstep sound 4 of 8
    ├── footstep-5.mp3       # Footstep sound 5 of 8
    ├── footstep-6.mp3       # Footstep sound 6 of 8
    ├── footstep-7.mp3       # Footstep sound 7 of 8
    └── footstep-8.mp3       # Footstep sound 8 of 8
```

## Sound Types

### Event Sounds (One-shot)
- **shell-collection.mp3**: Plays when the crab collects a shell
- **crab-flip.mp3**: Plays when the crab flips over (health reaches 0)
- **crab-revival.mp3**: Plays when the crab gets back up (health recovers to 10%+)
- **yelling.mp3**: Plays when the game ends and the crab starts running away

### Looping Sounds
- **background-ambient.mp3**: Continuous ambient background sound (ocean waves, wind, etc.)
- **drowning.mp3**: Continuous sound that plays when the crab's health is at 0

### Footstep Sounds
- **footsteps/footstep-1.mp3** through **footsteps/footstep-8.mp3**: 8 different footstep sounds that play randomly while the crab is walking

## Audio Format
- Use **MP3** format for best compatibility
- Keep file sizes reasonable (under 1MB each for event sounds, under 5MB for looping sounds)
- Recommended sample rate: 44.1kHz
- Recommended bitrate: 128-192 kbps

## How It Works
1. The sound system automatically loads all sound files when the game starts
2. Event sounds play once when triggered
3. Looping sounds start/stop based on game state
4. Footstep sounds play in sequence while walking, with spatial audio (stereo panning based on position)
5. All sounds respect the master volume setting

## Adding New Sounds
To add new sounds:
1. Place your audio file in the appropriate folder
2. Update the `SOUND_FILES` object in `src/sounds/SoundLoader.tsx`
3. Add the sound type to the `SoundType` union in `src/sounds/index.ts`
4. Configure the sound in `SOUND_CONFIGS` in `src/sounds/index.ts`
5. Trigger the sound using `playSound('yourSoundType')` in your components
