import { animation, defineExercises } from './build';

export const coreExercises = [
  ...defineExercises({ primary:['core'], secondary:[], movement:'trunk-flexion', prescription:'reps', animation:animation('crunch','supine'), cues:['Exhale and curl the rib cage toward the pelvis using your abdomen, not momentum.', 'Return slowly without pulling on your neck or letting your lower back arch.'] }, [
    ['Crunch', [[]], 'Lie on your back with knees bent, feet down, and fingertips lightly behind your ears.'],
    ['Reverse crunch', [[]], 'Lie on your back with knees above hips; curl your pelvis a little off the floor without swinging your legs.'],
    ['Bicycle crunch', [[]], 'Lie on your back and alternate bringing a shoulder toward the opposite knee while extending the other leg.', { animation:{ ...animation('crunch','supine'), unilateral:true } }],
    ['Stability-ball crunch', [['stability-ball']], 'Support your lower back on a stability ball with feet planted wide enough for balance.'],
    ['Cable crunch', [['cable']], 'Kneel facing a high pulley with a rope beside your temples; curl the trunk rather than sitting your hips back.', { animation:animation('crunch','seated','cable') }],
    ['Dumbbell crunch', [['dumbbells']], 'Hold one light dumbbell against your chest while lying with knees bent.', { animation:animation('crunch','supine','dumbbells') }],
  ]),
  ...defineExercises({ primary:['core'], secondary:[], movement:'trunk-stability', prescription:'time', animation:animation('static','prone'), cues:['Brace your abdomen and keep your ribs stacked over your pelvis.', 'Breathe steadily while holding the position; end the hold before your back sags or form changes.'] }, [
    ['Plank', [[]], 'Place elbows beneath shoulders and extend your legs, supporting yourself on forearms and toes.'],
    ['Knee plank', [[]], 'Support yourself on forearms and knees with a straight line from head to knees.'],
    ['Side plank', [[]], 'Lie on your side and support yourself on one forearm and stacked feet; perform both sides.', { animation:{ ...animation('static','supine'), unilateral:true } }],
    ['Hollow hold', [[]], 'Lie on your back, flatten your lower back to the floor, and lift shoulders and bent or straight legs slightly.', { animation:animation('static','supine'), difficulty:'intermediate' }],
    ['Wall sit', [[]], 'Slide your back down a wall until knees are comfortably bent and hold with feet flat.', { primary:['quads'], secondary:['glutes'], movement:'squat', animation:animation('static','seated') }],
    ['Farmer hold', [['dumbbells'],['kettlebell']], 'Stand tall with weights at your sides; resist leaning or shrugging.', { secondary:['back'], animation:animation('static','standing','dumbbells') }],
  ]),
  ...defineExercises({ primary:['core'], secondary:[], movement:'trunk-stability', prescription:'reps', animation:animation('static','supine'), cues:['Move slowly while resisting rotation and keeping your lower back controlled.', 'Return to the start without holding your breath; alternate evenly when working one side at a time.'] }, [
    ['Dead bug', [[]], 'Lie with hips and knees bent to 90 degrees and arms up; extend one leg and the opposite arm without arching.', { animation:{ ...animation('static','supine'), unilateral:true } }],
    ['Bird dog', [[]], 'Start on hands and knees; reach one arm forward and the opposite leg back without shifting your hips.', { secondary:['glutes','back'], animation:{ ...animation('static','quadruped'), unilateral:true } }],
    ['Pallof press', [['cable'],['bands']], 'Stand side-on to a chest-height cable or securely anchored band and press the handle forward; repeat both sides.', { animation:animation('horizontal-press','standing','cable') }],
    ['Ab wheel rollout', [['ab-wheel']], 'Kneel holding the wheel below your shoulders; roll forward only as far as you can resist back extension.', { secondary:['back','shoulders'], animation:animation('horizontal-press','quadruped'), difficulty:'advanced' }],
    ['Plank shoulder tap', [[]], 'Start in a high plank with feet wide; lift one hand to the opposite shoulder while keeping hips level.', { secondary:['shoulders'], animation:{ ...animation('static','prone'), unilateral:true }, difficulty:'intermediate' }],
  ]),
];
