const levelService = require('../services/levelService');
const levelContentsService = require('../services/levelContentsService');

class LevelController {
  async create(req, res) {
    try {
      console.log('🔍 DEBUG create - req.user:', req.user);
      const data = { ...req.body, createdBy: req.user?.id };
      console.log('📝 DEBUG create - data:', { name: data.name, createdBy: data.createdBy });
      const level = await levelService.createLevel(data);
      res.status(201).json(level);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async createHierarchy(req, res) {
    try {
      const data = { ...req.body, root: { ...req.body.root, createdBy: req.user?.id } };
      const levels = await levelService.createHierarchy(data);
      res.status(201).json(levels);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async createHierarchyFromExcel(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?.id };
      const result = await levelService.createHierarchyFromExcel(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async cloneHierarchy(req, res) {
    try {
      const { id } = req.params;
      const { parentId } = req.body || {};
      const result = await levelService.cloneHierarchy({
        sourceId: id,
        targetParentId: parentId,
        createdBy: req.user?.id
      });
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const { parentId } = req.query || {};
      const levels = await levelService.getLevels({ parentId });
      res.json(levels);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const level = await levelService.getLevelById(req.params.id);
      if (!level) return res.status(404).json({ error: 'Level not found' });
      res.json(level);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const data = { ...req.body };
      if (data.status === 'completed' && data.closedBy === undefined) {
        data.closedBy = req.user?.id;
      }
      const level = await levelService.updateLevel(req.params.id, data);
      res.json(level);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      await levelService.deleteLevel(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async complete(req, res) {
    try {
      const level = await levelService.completeLevel(req.params.id);
      res.json(level);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getTree(req, res) {
    try {
      const { id } = req.params;
      const tree = await levelService.getLevelTree(id);
      if (!tree) return res.status(404).json({ error: 'Level not found' });
      res.json(tree);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async reorder(req, res) {
    try {
      const { parentId, orderedIds } = req.body || {};
      const result = await levelService.reorderLevels(parentId, orderedIds);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getContents(req, res) {
    try {
      const { id } = req.params;
      const filters = {
        types: req.query.types ? req.query.types.split(',') : undefined,
        q: req.query.q,
        from: req.query.from,
        to: req.query.to,
        limit: req.query.limit,
        offset: req.query.offset
      };
      const contents = await levelContentsService.getContents(id, filters);
      res.json(contents);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getHierarchy(req, res) {
    try {
      const { id } = req.params;
      const tree = await levelService.getHierarchyTree(id);
      if (!tree) return res.status(404).json({ error: 'Level not found' });
      res.json(tree);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getRatio(req, res) {
    try {
      const { id } = req.params;
      const ratio = await levelService.getLeafNodesRatio(id);
      res.json(ratio);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new LevelController();