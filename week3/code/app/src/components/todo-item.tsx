"use client";

import { Checkbox, IconButton, ListItem, Flex, Spacer } from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { PublicKey } from "@solana/web3.js";
import TodoProgram from "@/lib/todo-program";
import useAnchorProvider from "@/hooks/use-anchor-provider";

export default function TodoItem({
  content,
  completed = false,
  index,
  profileKey,
  onDelete,
}: {
  content: string;
  completed?: boolean;
  index: number;
  profileKey: PublicKey;
  onDelete: () => void;
}) {
  const provider = useAnchorProvider();
  const todoProgram = new TodoProgram(provider);

  const handleToggle = async () => {
    await todoProgram.toggleTodo(profileKey, index);
    window.location.reload(); // hoặc refetch lại React Query
  };

  const handleDelete = async () => {
    await todoProgram.deleteTodo(profileKey, index);
    onDelete(); // callback từ cha để refresh UI
  };

  return (
    <ListItem
      borderBottomColor="gray.500"
      borderBottomWidth="1px"
      py={4}
    >
      <Flex align="center">
        <Checkbox
          isChecked={completed}
          onChange={handleToggle}
          sx={{
            textDecoration: completed ? "line-through" : "initial",
          }}
        >
          {content}
        </Checkbox>
        <Spacer />
        <IconButton
          aria-label="Delete todo"
          icon={<DeleteIcon />}
          size="sm"
          colorScheme="red"
          onClick={handleDelete}
        />
      </Flex>
    </ListItem>
  );
}
