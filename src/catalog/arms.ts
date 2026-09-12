import { animation, defineExercises } from './build';

export const armExercises = [
  ...defineExercises({ primary:['biceps'], secondary:[], movement:'elbow-flexion', prescription:'reps', animation:animation('curl','standing','dumbbells'), cues:['Curl by bending your elbows while keeping the upper arms still.', 'Lower to a comfortable straight-arm position without swinging your torso.'] }, [
    ['Dumbbell curl', [['dumbbells']], 'Stand with palms forward and elbows beside your ribs.'],
    ['Hammer curl', [['dumbbells']], 'Hold dumbbells with palms facing inward and keep that grip throughout the curl.'],
    ['Alternating dumbbell curl', [['dumbbells']], 'Curl one arm at a time while the other remains at your side; complete equal repetitions.', { animation:{ ...animation('curl','standing','dumbbells'), unilateral:true } }],
    ['Barbell curl', [['barbell']], 'Stand with an underhand shoulder-width grip on the bar.', { animation:animation('curl','standing','barbell') }],
    ['Reverse barbell curl', [['barbell']], 'Use a light bar and an overhand grip, keeping wrists straight.', { animation:animation('curl','standing','barbell') }],
    ['Incline dumbbell curl', [['dumbbells','bench']], 'Sit against an incline bench and let your arms hang just behind your torso.', { animation:animation('curl','seated','dumbbells') }],
    ['Concentration curl', [['dumbbells','bench']], 'Sit on a bench, brace the upper arm against your inner thigh, and curl one dumbbell; repeat both sides.', { animation:{ ...animation('curl','seated','dumbbells'), unilateral:true } }],
    ['Cable curl', [['cable']], 'Stand facing a low pulley and hold a straight-bar attachment with palms up.', { animation:animation('curl','standing','cable') }],
    ['Cable rope hammer curl', [['cable']], 'Face a low pulley and grip both ends of a rope with palms inward.', { animation:animation('curl','standing','cable') }],
    ['Band curl', [['bands']], 'Stand on the middle of a band and hold its ends with palms up.', { animation:animation('curl','standing') }],
    ['Dumbbell preacher curl', [['dumbbells','bench']], 'Stand behind an inclined bench and support one upper arm fully on the pad; repeat both sides.', { animation:{ ...animation('curl','standing','dumbbells'), unilateral:true } }],
  ]),
  ...defineExercises({ primary:['triceps'], secondary:[], movement:'elbow-extension', prescription:'reps', animation:animation('extension','standing','cable'), cues:['Straighten your elbows without moving the upper arms or flaring your ribs.', 'Bend your elbows slowly to return, keeping wrists straight and the load controlled.'] }, [
    ['Cable triceps pushdown', [['cable']], 'Face a high pulley, grip the bar, and tuck your elbows beside your ribs.'],
    ['Rope triceps pushdown', [['cable']], 'Grip a high-pulley rope with palms inward; separate the ends slightly at the bottom.'],
    ['Overhead cable triceps extension', [['cable']], 'Face away from a high pulley in a split stance and hold the rope behind your head.'],
    ['Single-arm cable pushdown', [['cable']], 'Hold a high-pulley handle with one hand and keep that elbow at your side; repeat both sides.', { animation:{ ...animation('extension','standing','cable'), unilateral:true } }],
    ['Dumbbell overhead triceps extension', [['dumbbells']], 'Hold one dumbbell by its upper end with both hands overhead.', { animation:animation('extension','standing','dumbbells') }],
    ['Seated dumbbell triceps extension', [['dumbbells','bench']], 'Sit upright and hold one dumbbell overhead with both hands.', { animation:animation('extension','seated','dumbbells') }],
    ['Dumbbell skull crusher', [['dumbbells','bench']], 'Lie on a bench with dumbbells over your shoulders; bend elbows to lower beside your head.', { animation:animation('extension','supine','dumbbells') }],
    ['Barbell skull crusher', [['barbell','bench']], 'Lie on a bench with a light bar over your shoulders and lower it behind the crown of your head.', { animation:animation('extension','supine','barbell'), difficulty:'intermediate' }],
    ['Dumbbell kickback', [['dumbbells']], 'Hinge forward, hold elbows high beside your torso, and extend the dumbbells backward.', { animation:animation('extension','standing','dumbbells') }],
    ['Band triceps pushdown', [['bands']], 'Anchor a band securely overhead and hold the ends with elbows tucked.', { animation:animation('extension','standing') }],
  ]),
  ...defineExercises({ primary:['triceps'], secondary:['chest','shoulders'], movement:'horizontal-push', prescription:'reps', animation:animation('horizontal-press','prone'), cues:['Lower with elbows close to your torso and shoulders controlled.', 'Press to straight arms without bouncing or losing your trunk position.'] }, [
    ['Close-grip push-up', [[]], 'Set hands just inside shoulder width and hold a straight plank.', { difficulty:'intermediate' }],
    ['Close-grip bench press', [['barbell','bench','rack']], 'Lie on a bench inside a rack with safeties; use a shoulder-width grip.', { animation:animation('horizontal-press','supine','barbell'), difficulty:'intermediate' }],
    ['Parallel-bar dip', [['dip-bars']], 'Support yourself on parallel bars, keep your torso nearly upright, and stop before a deep shoulder stretch.', { movement:'vertical-push', animation:animation('vertical-press','standing'), difficulty:'advanced' }],
    ['Assisted dip', [['assisted-pullup']], 'Use a combined assisted pull-up/dip station with dip handles and enough counterweight for control.', { movement:'vertical-push', animation:animation('vertical-press','standing','machine') }],
  ]),
];
