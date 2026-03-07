import { Check, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { useStore } from '../lib/store';
import { Subtask } from '../types';

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
  disabled?: boolean;
}

export default function SubtaskList({ taskId, subtasks, disabled }: SubtaskListProps) {
  const { addSubtask, toggleSubtask, deleteSubtask } = useStore();
  const [newTitle, setNewTitle] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    await addSubtask(taskId, { title });
    setNewTitle('');
    setShowInput(false);
  };

  const doneCount = subtasks.filter((s) => s.status === 'done').length;

  return (
    <View style={styles.container}>
      {subtasks.length > 0 && (
        <Text style={styles.progress}>
          {doneCount}/{subtasks.length} subtasks
        </Text>
      )}

      {subtasks.map((subtask) => (
        <View key={subtask.id} style={styles.subtaskRow}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              subtask.status === 'done' && styles.checkboxDone,
            ]}
            onPress={() => toggleSubtask(subtask)}
          >
            {subtask.status === 'done' && (
              <Check color={Colors.background} size={12} />
            )}
          </TouchableOpacity>
          <Text
            style={[
              styles.subtaskTitle,
              subtask.status === 'done' && styles.subtaskTitleDone,
            ]}
            numberOfLines={1}
          >
            {subtask.title}
          </Text>
          {!disabled && (
            <TouchableOpacity
              onPress={() => deleteSubtask(subtask.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X color={Colors.textMuted} size={14} />
            </TouchableOpacity>
          )}
        </View>
      ))}

      {!disabled && (showInput ? (
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Subtask title"
            placeholderTextColor={Colors.textMuted}
            value={newTitle}
            onChangeText={setNewTitle}
            onSubmitEditing={handleAdd}
            autoFocus
            returnKeyType="done"
          />
          <TouchableOpacity onPress={handleAdd} style={styles.addConfirm}>
            <Check color={Colors.green} size={16} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setShowInput(false); setNewTitle(''); }}>
            <X color={Colors.textMuted} size={16} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowInput(true)}
        >
          <Plus color={Colors.textMuted} size={14} />
          <Text style={styles.addText}>Add subtask</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  progress: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  subtaskTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  addInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    backgroundColor: Colors.secondary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addConfirm: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    marginTop: 4,
  },
  addText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});